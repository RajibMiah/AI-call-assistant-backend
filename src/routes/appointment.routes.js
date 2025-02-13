const express = require('express');
const {
    bookAppointment,
    getAvailableSlots,
    cancelAppointment,
    getAppointmentType,
} = require('../controllers/appointment.controller');

const router = express.Router();

router.post('/book', bookAppointment); // Book an appointment
router.post('/appointment_slots', getAvailableSlots);
router.post('/cancel_appointment', cancelAppointment);
router.get('/appointment-types', getAppointmentType);
// router.put('/cancel/:id', cancelAppointment); // Cancel an appointment
// router.put('/reschedule/:id', rescheduleAppointment); // Reschedule an appointment
// router.get('/', getAppointments); // Get all appointments

module.exports = router;
