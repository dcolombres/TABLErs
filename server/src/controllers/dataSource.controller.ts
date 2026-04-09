import { Request, Response } from 'express';
import db from '../services/db.service.js';

// Get Data Sources for a Dashboard
export const getDataSourcesByDashboardId = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const dataSources = await db('data_sources').where({ dashboard_id: dashboardId }).select('*');
    res.status(200).json(dataSources);
  } catch (error: any) {
    res.status(500).json({ error: `Error al obtener las fuentes de datos: ${error.message}` });
  }
};

// Delete a Data Source
export const deleteDataSource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db('data_sources').where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada.' });
    }
    res.status(200).json({ message: 'Fuente de datos eliminada exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: `Error al eliminar la fuente de datos: ${error.message}` });
  }
};
