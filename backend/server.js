const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

// Создаем приложение Express
const app = express();
const port = 5000; 

app.use(cors());
app.use(express.json()); 

// Подключение к базе данных
const db = mysql.createConnection({
    host: 'localhost',       // Хост базы данных
    user: 'root',            // Имя пользователя базы данных
    password: 'root',    // Пароль пользователя базы данных
    database: 'polyclinic' // Название базы данных
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('Подключение к базе данных успешно!');
});

// Маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.send('Сервер работает!');
});

// Получение всех смен с процедурами и записями на процедуры
app.get('/shifts', (req, res) => {
    const sql = `
        SELECT 
            s.shift_id,
            s.complexity_limit,
            s.shift_date,
            p.procedure_id,
            p.procedure_name,
            p.procedure_complexity,
            sa.appointment_id,
            sa.patient_name
        FROM Shifts s
        LEFT JOIN shift_procedures sp ON s.shift_id = sp.shift_id
        LEFT JOIN procedures p ON sp.procedure_id = p.procedure_id
        LEFT JOIN shift_appointments sa ON s.shift_id = sa.shift_id AND p.procedure_id = sa.procedure_id
        ORDER BY s.shift_id, p.procedure_id, sa.appointment_id;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            return res.status(500).json({ error: 'Ошибка при получении данных', details: err });
        }

        const shifts = {};

        results.forEach(row => {
            const { shift_id, complexity_limit, shift_date, procedure_id, procedure_name, procedure_complexity, appointment_id, patient_name } = row;

            if (!shifts[shift_id]) {
                shifts[shift_id] = {
                    shift_id,
                    complexity_limit,
                    shift_date,
                    procedures: [],
                    appointments: []
                };
            }

            const procedure = {
                procedure_id,
                procedure_name,
                procedure_complexity
            };

            if (!shifts[shift_id].procedures.some(proc => proc.procedure_id === procedure_id)) {
                shifts[shift_id].procedures.push(procedure);
            }

            if (appointment_id) {
                shifts[shift_id].appointments.push({
                    shift_id,
                    appointment_id,
                    patient_name,
                    procedure_complexity,
                    procedure_name,
                    procedure_id
                });
            }
        });

        const response = Object.values(shifts);

        res.json(response); 
    });
});

// Добавление новой смены
app.post('/shifts/add', (req, res) => {
    const { shift_date, complexity_limit, procedures } = req.body;

    const addShiftSql = 'INSERT INTO Shifts (shift_date, complexity_limit) VALUES (?, ?)';
    db.query(addShiftSql, [shift_date, complexity_limit], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении смены:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении смены', details: err });
        }

        const shift_id = result.insertId;

        const insertProceduresSql = 'INSERT INTO shift_procedures (shift_id, procedure_id) VALUES ?';
        const proceduresValues = procedures.map(procedure_id => [shift_id, procedure_id]);

        db.query(insertProceduresSql, [proceduresValues], (err) => {
            if (err) {
                console.error('Ошибка при добавлении процедур для смены:', err);
                return res.status(500).json({ error: 'Ошибка при добавлении процедур для смены', details: err });
            }

            res.status(201).json({ message: 'Смена успешно создана' });
        });
    });
});

// Изменение информации о смене
app.put('/shifts/edit/:shift_id', (req, res) => {
    const { shift_id } = req.params;
    const { shift_date, complexity_limit, procedures } = req.body;

    const updateShiftSql = `
        UPDATE Shifts
        SET shift_date = ?, complexity_limit = ?
        WHERE shift_id = ?
    `;
    
    db.query(updateShiftSql, [shift_date, complexity_limit, shift_id], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении смены:', err);
            return res.status(500).json({ error: 'Ошибка при обновлении смены', details: err });
        }

        const deleteProceduresSql = 'DELETE FROM shift_procedures WHERE shift_id = ?';
        
        db.query(deleteProceduresSql, [shift_id], (err) => {
            if (err) {
                console.error('Ошибка при удалении старых процедур:', err);
                return res.status(500).json({ error: 'Ошибка при удалении старых процедур', details: err });
            }

            const insertProceduresSql = 'INSERT INTO shift_procedures (shift_id, procedure_id) VALUES ?';
            const proceduresValues = procedures.map(procedure_id => [shift_id, procedure_id]);

            db.query(insertProceduresSql, [proceduresValues], (err) => {
                if (err) {
                    console.error('Ошибка при добавлении новых процедур:', err);
                    return res.status(500).json({ error: 'Ошибка при добавлении новых процедур', details: err });
                }

                res.status(200).json({ message: 'Данные о смене успешно обновлены' });
            });
        });

    });
});

// Удаление смены
app.delete('/shifts/delete/:shift_id', (req, res) => {
    const { shift_id } = req.params;

    const deleteAppointmentsSql = 'DELETE FROM shift_appointments WHERE shift_id = ?';

    db.query(deleteAppointmentsSql, [shift_id], (err) => {
        if (err) {
            console.error('Ошибка при удалении записей на процедуры:', err);
            return res.status(500).json({ error: 'Ошибка при удалении записей на процедуры', details: err });
        }

        const deleteProceduresSql = 'DELETE FROM shift_procedures WHERE shift_id = ?';

        db.query(deleteProceduresSql, [shift_id], (err) => {
            if (err) {
                console.error('Ошибка при удалении процедур, привязанных к смене:', err);
                return res.status(500).json({ error: 'Ошибка при удалении процедур, привязанных к смене', details: err });
            }

            const deleteShiftSql = 'DELETE FROM Shifts WHERE shift_id = ?';

            db.query(deleteShiftSql, [shift_id], (err) => {
                if (err) {
                    console.error('Ошибка при удалении смены:', err);
                    return res.status(500).json({ error: 'Ошибка при удалении смены', details: err });
                }

                res.status(200).json({ message: `Смена успешно удалена` });
            });
        });
    });
});

// Получение всех процедур
app.get('/procedures', (req, res) => {
    const sql = 'SELECT procedure_id, procedure_name, procedure_complexity FROM procedures';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            return res.status(500).json({ error: 'Ошибка при получении данных', details: err });
        }

        res.json(results);
    });
});

// Добавление новой процедуры
app.post('/procedures/add', (req, res) => {
    const { procedure_name, procedure_complexity } = req.body;

    if (!procedure_name || procedure_complexity === undefined) {
        return res.status(400).json({ error: 'Необходимо указать имя процедуры и ее сложность' });
    }

    const sql = 'INSERT INTO procedures (procedure_name, procedure_complexity) VALUES (?, ?)';

    db.query(sql, [procedure_name, procedure_complexity], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении процедуры:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении процедуры', details: err });
        }

        res.status(201).json({ message: 'Процедура успешно добавлена' });
    });
});

// Добавление новой записи на процедуру
app.post('/appointments/add', (req, res) => {
    const { shift_id, procedure_id, patient_name } = req.body;

    const sql = 'INSERT INTO shift_appointments (shift_id, procedure_id, patient_name) VALUES (?, ?, ?)';

    db.query(sql, [parseInt(shift_id), parseInt(procedure_id), patient_name], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении записи на процедуру:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении записи на процедуру', details: err });
        }

        res.status(201).json({ message: 'Запись на процедуру успешно добавлена' });
    });
});

// Удаление записи на процедуру
app.delete('/appointments/delete/:appointment_id', (req, res) => {
    const { appointment_id } = req.params;

    const sql = 'DELETE FROM shift_appointments WHERE appointment_id = ?';

    db.query(sql, [appointment_id], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении записи на процедуру:', err);
            return res.status(500).json({ error: 'Ошибка при удалении записи на процедуру', details: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Запись на процедуру не найдена' });
        }

        res.status(201).json({ message: 'Запись на процедуру успешно удалена' });
    });
});

// Перенаправление записи на другую смену
app.put('/appointments/move/:appointment_id', (req, res) => {
    const { appointment_id } = req.params;
    const { new_shift_id } = req.body;

    if (!appointment_id || !new_shift_id) {
        return res.status(400).json({ error: 'Необходимо указать ID записи и ID новой смены' });
    }

    const sql = 'UPDATE shift_appointments SET shift_id = ? WHERE appointment_id = ?';

    db.query(sql, [new_shift_id, appointment_id], (err, result) => {
        if (err) {
            console.error('Ошибка при перенаправлении записи на другую смену:', err);
            return res.status(500).json({ error: 'Ошибка при перенаправлении записи', details: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Запись на процедуру не найдена' });
        }

        res.status(201).json({ message: 'Запись на процедуру успешно передвинута на другую смену' });
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});