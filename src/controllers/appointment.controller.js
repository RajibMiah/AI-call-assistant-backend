const { response } = require('../app');
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
            appointment_type_id,
            provider_id,
            start_time,
            end_time,
            operatory_id,
        } = req.body;

        // Validate required fields
        if (
            !first_name ||
            !last_name ||
            !date_of_birth ||
            !phone_number ||
            !appointment_type_id
        ) {
            return res.status(400).json({
                code: false,
                description: 'Missing or incorrect required fields',
                error: [
                    'Required: first_name, last_name, email, date_of_birth (YYYY-MM-DD), phone_number, appointment_type_id',
                ],
                data: {},
                count: 0,
            });
        }

        // Validate date_of_birth format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
            return res.status(400).json({
                code: false,
                description: 'Invalid date format. Expected format: YYYY-MM-DD',
                error: ['Ensure date_of_birth follows the YYYY-MM-DD format'],
                data: {},
                count: 0,
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                code: false,
                description: 'Invalid email format',
                error: [
                    'Ensure email is in a valid format (example@example.com)',
                ],
                data: {},
                count: 0,
            });
        }

        // Validate phone number format (basic check)
        if (!/^\d{10,15}$/.test(phone_number)) {
            return res.status(400).json({
                code: false,
                description: 'Invalid phone number format',
                error: [
                    'Ensure phone number contains only digits and has a length between 10-15 characters',
                ],
                data: {},
                count: 0,
            });
        }

        // Check if patient exists
        let patient;
        try {
            patient = await nexHealthService.findPatientByDetails(
                email,
                phone_number,
                first_name,
                last_name
            );
        } catch (err) {
            console.error('❌ Error finding patient:', err);
            return res.status(500).json({
                code: false,
                description: 'Error while finding patient',
                error: [err.message],
                data: {},
                count: 0,
            });
        }

        let is_new_patient = false;
        if (!patient) {
            try {
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
            } catch (err) {
                console.error('❌ Error registering patient:', err);
                return res.status(500).json({
                    code: false,
                    description: 'Error while registering new patient',
                    error: [err.message],
                    data: {},
                    count: 0,
                });
            }
        }

        // Fetch appointment type
        let appointment_type;
        try {
            appointment_type = await nexHealthService.findAppointmentType(
                appointment_type_id
            );
            if (!appointment_type) {
                return res.status(400).json({
                    code: false,
                    description: 'Invalid appointment type',
                    error: [
                        'Appointment type ID is incorrect or does not exist',
                    ],
                    data: {},
                    count: 0,
                });
            }
        } catch (err) {
            console.error('❌ Error finding appointment type:', err);
            return res.status(500).json({
                code: false,
                description: 'Error fetching appointment type',
                error: [err.message],
                data: {},
                count: 0,
            });
        }

        // Find available appointment slot
        let selected_date_time;
        try {
            selected_date_time = { start_time, end_time, operatory_id };
            // await nexHealthService.findSelectedAppointmentSlot(
            //     provider_id,
            //     start_time,
            //     end_time,
            //     operatory_id
            // );
            if (!selected_date_time) {
                return res.status(400).json({
                    code: false,
                    description: 'Invalid or unavailable appointment slot',
                    error: ['Selected slot is unavailable or does not exist'],
                    data: {},
                    count: 0,
                });
            }
        } catch (err) {
            console.error('❌ Error finding appointment slot:', err);
            return res.status(500).json({
                code: false,
                description: 'Error fetching available appointment slot',
                error: [err.message],
                data: {},
                count: 0,
            });
        }

        // Book the appointment
        let appointment;
        try {
            appointment = await nexHealthService.bookAppointmentService(
                patient,
                appointment_type,
                selected_date_time,
                note,
                is_new_patient,
                provider_id
            );
        } catch (err) {
            console.error('❌ Error booking appointment:', err);
            return res.status(500).json({
                code: false,
                description: 'Error booking appointment',
                error: [err.message],
                data: {},
                count: 0,
            });
        }

        // Success response
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
        console.error('❌ Unexpected error in bookAppointment:', error);
        res.status(500).json({
            code: false,
            description: 'Unexpected server error',
            error: [error.message],
            data: {},
            count: 0,
        });
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

exports.getAppointmentType = async (req, res) => {
    try {
        const data = await nexHealthService.getAppointmentType();

        const filteredData = data?.map(({ id, name, minutes }) => ({
            id,
            name,
            minutes,
        }));

        res.status(200).json({
            code: true,
            description: 'appointment type get successfull',
            data: filteredData,
            count: filteredData.length,
        });
    } catch (error) {
        console.error('❌ Error in getting appointment types:', error);
        res.status(500).json(error);
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
