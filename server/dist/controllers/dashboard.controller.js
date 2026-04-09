import db from '../services/db.service.js';
// Create Dashboard
export const createDashboard = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'El nombre del tablero es requerido.' });
        }
        const [id] = await db('dashboards').insert({ name, description });
        res.status(201).json({ message: 'Tablero creado exitosamente.', id, name, description });
    }
    catch (error) {
        res.status(500).json({ error: `Error al crear el tablero: ${error.message}` });
    }
};
// Get All Dashboards
export const getDashboards = async (req, res) => {
    try {
        const dashboards = await db('dashboards').select('*');
        res.status(200).json(dashboards);
    }
    catch (error) {
        res.status(500).json({ error: `Error al obtener los tableros: ${error.message}` });
    }
};
// Get Dashboard by ID
export const getDashboardById = async (req, res) => {
    try {
        const { id } = req.params;
        const dashboard = await db('dashboards').where({ id }).first();
        if (!dashboard) {
            return res.status(404).json({ error: 'Tablero no encontrado.' });
        }
        res.status(200).json(dashboard);
    }
    catch (error) {
        res.status(500).json({ error: `Error al obtener el tablero: ${error.message}` });
    }
};
// Update Dashboard
export const updateDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const updated = await db('dashboards').where({ id }).update({ name, description, updated_at: db.fn.now() });
        if (!updated) {
            return res.status(404).json({ error: 'Tablero no encontrado.' });
        }
        res.status(200).json({ message: 'Tablero actualizado exitosamente.' });
    }
    catch (error) {
        res.status(500).json({ error: `Error al actualizar el tablero: ${error.message}` });
    }
};
// Delete Dashboard
export const deleteDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db('dashboards').where({ id }).del();
        if (!deleted) {
            return res.status(404).json({ error: 'Tablero no encontrado.' });
        }
        res.status(200).json({ message: 'Tablero eliminado exitosamente.' });
    }
    catch (error) {
        res.status(500).json({ error: `Error al eliminar el tablero: ${error.message}` });
    }
};
