const nexHealthService = require('../services/nexhealth.service');
const moment = require('moment');


exports.bookAppointment = async (req, res) => {
    try {
        console.log("reqest body" , req.body);

        const { first_name, last_name, email, date_of_birth, phone_number, start_time, operatory_id, note } = req.body;

        if (!first_name || !last_name || !email || !date_of_birth || !phone_number || !start_time || !operatory_id) {
            return res.status(400).json({
                code: false,
                description: "Missing required fields",
                error: ["Required: first_name, last_name, email, date_of_birth, phone_number, start_time, operatory_id"],
                data: {},
                count: 0
            });
        }

        // 1️⃣ Default Provider ID
        let providerId = 344578779;

        // 2️⃣ Check if the patient already exists by phone number
        let patient = await nexHealthService.getPatientsByPhone(phone_number);
        
        // 3️⃣ If patient not found, register them
        if (!patient) {
            console.log("🚀 Patient not found by phone number. Registering...");

            patient = await nexHealthService.registerPatient(providerId, first_name, last_name, email, date_of_birth, phone_number);

            if (!patient || !patient.patient) {
                return res.status(500).json({
                    code: false,
                    description: "Error registering new patient",
                    error: ["Could not register patient"],
                    data: {},
                    count: 0
                });
            }
        }

        // 4️⃣ Book the appointment now that the patient exists
        const appointment = await nexHealthService.bookAppointment(
            patient.patient.id,
            providerId,
            start_time,
            operatory_id,
            note
        );

        res.status(201).json({
            code: true,
            description: "✅ Appointment booked successfully",
            data: {
                user: {
                    id: patient.patient.id,
                    email: patient.patient.email,
                    first_name: patient.patient.first_name,
                    middle_name: patient.patient.middle_name || "",
                    last_name: patient.patient.last_name,
                    name: `${patient.patient.first_name} ${patient.patient.last_name}`,
                    created_at: patient.patient.created_at,
                    updated_at: patient.patient.updated_at,
                    institution_id: patient.patient.institution_id || null,
                    foreign_id: patient.patient.foreign_id || "",
                    foreign_id_type: patient.patient.foreign_id_type || "",
                    bio: patient.patient.bio || {},
                    inactive: patient.patient.inactive || false,
                    last_sync_time: patient.patient.last_sync_time || "",
                    guarantor_id: patient.patient.guarantor_id || null,
                    unsubscribe_sms: patient.patient.unsubscribe_sms || false
                }
            },
            count: 1
        });

    } catch (error) {
        console.error("❌ Error in bookAppointment:", error);
        res.status(500).json({
            code: false,
            description: "Error booking appointment",
            error: [error.response?.data || error.message],
            data: {},
            count: 0
        });
    }
};


exports.getAvailableSlots = async (req, res) => {
    console.log("Available slot body", req.body);
    
    const { start_date, start_time, days, lids, pids, operatory_id } = req.body;

    // Validate input
    if (!start_date || !days || !lids || !pids || lids.length === 0 || pids.length === 0) {
        return res.status(400).json({
            code: false,
            description: "Required fields missing",
            error: ["Required: start_date, days, lids, pids"],
            data: [],
            count: 0
        });
    }

    try {
        // Step 1: Fetch available slots from the service
        const availableSlots = await nexHealthService.getAvailableSlots(start_date, days, lids, pids);
        
        let allSlots = [];
        availableSlots.forEach(slotData => {
            slotData.slots.forEach(slot => {
                if (!operatory_id || operatory_id.includes(slot.operatory_id)) {
                    allSlots.push({
                        lid: slotData.lid,
                        pid: slotData.pid,
                        time: new Date(slot.time),
                        end_time: new Date(slot.end_time),
                        operatory_id: slot.operatory_id
                    });
                }
            });
        });

        // Convert start_time to a Date object for comparison
        const referenceTime = new Date(`${start_date}T${start_time}`);

        // Step 2: Filter and sort the slots based on the nearest available time
        allSlots.sort((a, b) => Math.abs(a.time - referenceTime) - Math.abs(b.time - referenceTime));

        // Step 3: Select the top 3 nearest slots
        const nearestSlots = allSlots.slice(0, 3);

        return res.status(200).json({
            code: true,
            description: nearestSlots.length > 0 ? "Requested time not available, nearest slots found" : "No available slots found",
            data: nearestSlots,
            count: nearestSlots.length
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            code: false,
            description: "Error processing request",
            error: [error.message],
            data: [],
            count: 0
        });
    }
};



// // Helper function to group the available slots by location and patient
// const groupSlotsByLocationAndPatient = (availableSlots) => {
//     const groupedData = [];

//     availableSlots.forEach((slot) => {
//         // Find existing group for this location and patient
//         const existingGroup = groupedData.find(group => group.lid === slot.lid && group.pid === slot.pid);

//         // If group does not exist, create one
//         if (!existingGroup) {
//             groupedData.push({
//                 lid: slot.lid,
//                 pid: slot.pid,
//                 operatory_id: slot.operatory_id,
//                 slots: [
//                     {
//                         time: slot.start_time,
//                         operatory_id: slot.operatory_id,
//                         provider_id: slot.provider_id
//                     }
//                 ],
//                 next_available_date: moment(slot.start_time).format('YYYY-MM-DD')
//             });
//         } else {
//             // If group exists, add the new slot to it
//             existingGroup.slots.push({
//                 time: slot.start_time,
//                 operatory_id: slot.operatory_id,
//                 provider_id: slot.provider_id
//             });
//             // Update next available date (if necessary)
//             const nextDate = moment(slot.start_time).format('YYYY-MM-DD');
//             if (moment(nextDate).isBefore(existingGroup.next_available_date)) {
//                 existingGroup.next_available_date = nextDate;
//             }
//         }
//     });

//     return groupedData;
// };


// Controller to cancel an appointment
exports.cancelAppointment = async (req, res) => {
    const { email, phone_number, first_name, last_name } = req.body;

    // Validate input
    if (!email && !phone_number && !first_name && !last_name) {
        return res.status(400).json({
            code: false,
            description: "Missing required patient details",
            error: ["email, phone_number, first_name, last_name are required."],
            data: [],
            count: 0
        });
    }

    try {
        // Step 1: Find the patient using the provided details (email, phone_number, etc.)
        const patient = await nexHealthService.findPatientByDetails(email, phone_number, first_name, last_name);

        if (!patient) {
            return res.status(404).json({
                code: false,
                description: "Patient not found",
                error: ["Patient not found with provided details"],
                data: [],
                count: 0
            });
        }

        // Step 2: Retrieve the appointments for the patient using the patient ID
        const appointments = await nexHealthService.getAppointmentsByPatientId(patient.id);

        if (appointments.length === 0) {
            return res.status(404).json({
                code: false,
                description: "No appointments found for this patient",
                error: ["No appointments found for the provided patient"],
                data: [],
                count: 0
            });
        }

        // Step 3: Assume we cancel the first appointment found (you can enhance this with other logic)
        const appointment = appointments[0]; // Or choose a specific appointment if necessary

        // Step 4: Cancel the appointment
        const cancelResponse = await nexHealthService.cancelAppointment(appointment.id);

        // Step 5: Return the successful cancellation response
        return res.status(200).json({
            code: true,
            description: "Appointment canceled successfully",
            error: [],
            data: cancelResponse,
            count: 1
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            code: false,
            description: "Error canceling appointment",
            error: [error.message],
            data: [],
            count: 0
        });
    }
};

