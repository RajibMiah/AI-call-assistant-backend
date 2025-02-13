const nexHealthService = require('../services/nexhealth.service');
const moment = require('moment');

exports.bookAppointment = async (req, res) => {
    try {
        console.log('Request body:', req.body);

        const {
            first_name,
            last_name,
            email,
            date_of_birth,
            phone_number,
            note,
            appointment_type_obj,
            selected_date_time,
        } = req.body;

        if (
            !first_name ||
            !last_name ||
            !email ||
            !date_of_birth ||
            !phone_number ||
            typeof appointment_type_obj !== 'object' ||
            typeof selected_date_time !== 'object'
        ) {
            return res.status(400).json({
                code: false,
                description: 'Missing or incorrect required fields',
                error: [
                    'Required: first_name, last_name, email, date_of_birth, phone_number, appointment_type_obj (object), selected_date_time (string)',
                ],
                data: {},
                count: 0,
            });
        }

        let patient = await nexHealthService.findPatientByDetails(
            email,
            phone_number,
            first_name,
            last_name
        );

        let is_new_patient = false;

        if (!patient) {
            console.log('🚀 Patient not found. Registering...');
            patient = await nexHealthService.registerPatient(
                339157019,
                first_name,
                last_name,
                email,
                date_of_birth,
                phone_number
            );
            is_new_patient = true;
        }

        // let appointment_type = await nexHealthService.findAppointmentType(
        //     appointment_name
        // );

        let appointment = await nexHealthService.bookAppointmentService(
            patient,
            appointment_type_obj,
            selected_date_time,
            note,
            is_new_patient
        );

        res.status(201).json({
            code: true,
            description: '✅ Appointment booked successfully',
            data: {
                appointment: appointment.data,
                patient: patient,
            },
            count: 1,
        });
    } catch (error) {
        console.error('❌ Error in bookAppointment:', error);
        res.status(500).json(error);
    }
};

exports.getAvailableSlots = async (req, res) => {
    console.log('Available slot body', req.body);

    const { start_date, start_time, days, lids, pids, operatory_id } = req.body;

    // Validate input
    if (
        !start_date ||
        !days ||
        !lids ||
        !pids ||
        lids.length === 0 ||
        pids.length === 0
    ) {
        return res.status(400).json({
            code: false,
            description: 'Required fields missing',
            error: ['Required: start_date, days, lids, pids'],
            data: [],
            count: 0,
        });
    }

    try {
        // Step 1: Fetch available slots from the service
        const availableSlots = await nexHealthService.getAvailableSlots(
            start_date,
            days,
            lids,
            pids
        );

        let allSlots = [];
        availableSlots.forEach((slotData) => {
            slotData.slots.forEach((slot) => {
                if (!operatory_id || operatory_id.includes(slot.operatory_id)) {
                    allSlots.push({
                        lid: slotData.lid,
                        pid: slotData.pid,
                        time: new Date(slot.time),
                        end_time: new Date(slot.end_time),
                        operatory_id: slot.operatory_id,
                    });
                }
            });
        });

        // Convert start_time to a Date object for comparison
        const referenceTime = new Date(`${start_date}T${start_time}`);

        // Step 2: Filter and sort the slots based on the nearest available time
        allSlots.sort(
            (a, b) =>
                Math.abs(a.time - referenceTime) -
                Math.abs(b.time - referenceTime)
        );

        // Step 3: Select the top 3 nearest slots
        const nearestSlots = allSlots.slice(0, 3);

        return res.status(200).json({
            code: true,
            description:
                nearestSlots.length > 0
                    ? 'Requested time not available, nearest slots found'
                    : 'No available slots found',
            data: nearestSlots,
            count: nearestSlots.length,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
};

// Controller to cancel an appointment
exports.cancelAppointment = async (req, res) => {
    const { email, phone_number, first_name, last_name, appointment_type_id } =
        req.body;

    // Validate input
    if (!email && !phone_number && !first_name && !last_name) {
        return res.status(400).json({
            code: false,
            description: 'Missing required patient details',
            error: ['email, phone_number, first_name, last_name are required.'],
            data: [],
            count: 0,
        });
    }

    try {
        // Step 1: Find the patient using the provided details (email, phone_number, etc.)
        const patient = await nexHealthService.findPatientByDetails(
            email,
            phone_number,
            first_name,
            last_name
        );

        if (!patient) {
            return res.status(404).json({
                code: false,
                description: 'Patient not found',
                error: ['Patient not found with provided details'],
                data: [],
                count: 0,
            });
        }

        // Step 2: Retrieve the appointments for the patient using the patient ID
        const appointments = await nexHealthService.getAppointmentsByDetails(
            patient.id
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                code: false,
                description: 'No appointments found for this patient',
                error: ['No appointments found for the provided patient'],
                data: [],
                count: 0,
            });
        }

        const selected_appointment = appointments.find(
            (data) => data.appointment_type_id === appointment_type_id
        );

        console.log('filtred appointment arg====', selected_appointment);
        // Step 4: Cancel the appointment
        const cancelResponse = await nexHealthService.cancelAppointment(
            selected_appointment.id
        );

        // Step 5: Return the successful cancellation response
        return res.status(200).json({
            code: true,
            description: 'Appointment canceled successfully',
            error: [],
            data: cancelResponse,
            count: 1,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
};
