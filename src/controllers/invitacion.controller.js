/**
 * Controlador de Invitaciones
 * Endpoints para gestionar invitados y confirmaciones RSVP
 */

const invitacionService = require('../services/invitacion.service');

class InvitacionController {
  /**
   * POST /api/invitaciones/:eventoId
   * Crear invitación individual
   */
  async crearInvitacion(req, res) {
    try {
      const { eventoId } = req.params;
      const invitadoData = req.body;

      // Validaciones
      if (!invitadoData.nombre_invitado || !invitadoData.email) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y email son requeridos'
        });
      }

      const resultado = await invitacionService.crearInvitacion(parseInt(eventoId), invitadoData);

      res.status(201).json({
        success: true,
        message: 'Invitación creada exitosamente',
        data: resultado
      });
    } catch (error) {
      console.error('Error en crearInvitacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear invitación',
        error: error.message
      });
    }
  }

  /**
   * POST /api/invitaciones/:eventoId/masivo
   * Crear invitaciones masivas
   */
  async crearInvitacionesMasivas(req, res) {
    try {
      const { eventoId } = req.params;
      const { invitados } = req.body;

      if (!Array.isArray(invitados) || invitados.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de invitados'
        });
      }

      // Validar cada invitado
      for (const invitado of invitados) {
        if (!invitado.nombre_invitado || !invitado.email) {
          return res.status(400).json({
            success: false,
            message: 'Todos los invitados deben tener nombre y email'
          });
        }
      }

      const resultados = await invitacionService.crearInvitacionesMasivas(parseInt(eventoId), invitados);

      res.status(201).json({
        success: true,
        message: `${resultados.length} invitaciones creadas`,
        data: resultados
      });
    } catch (error) {
      console.error('Error en crearInvitacionesMasivas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear invitaciones masivas',
        error: error.message
      });
    }
  }

  /**
   * POST /api/invitaciones/:invitacionId/enviar
   * Enviar invitación por email
   */
  async enviarInvitacion(req, res) {
    try {
      const { invitacionId } = req.params;

      await invitacionService.enviarInvitacion(parseInt(invitacionId));

      res.json({
        success: true,
        message: 'Invitación enviada exitosamente'
      });
    } catch (error) {
      console.error('Error en enviarInvitacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar invitación',
        error: error.message
      });
    }
  }

  /**
   * POST /api/invitaciones/enviar-masivo
   * Enviar múltiples invitaciones
   */
  async enviarInvitacionesMasivas(req, res) {
    try {
      const { invitacion_ids } = req.body;

      if (!Array.isArray(invitacion_ids) || invitacion_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de IDs de invitaciones'
        });
      }

      const resultados = await invitacionService.enviarInvitacionesMasivas(invitacion_ids);

      res.json({
        success: true,
        message: 'Proceso de envío completado',
        data: resultados
      });
    } catch (error) {
      console.error('Error en enviarInvitacionesMasivas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar invitaciones masivas',
        error: error.message
      });
    }
  }

  /**
   * GET /api/invitaciones/evento/:eventoId
   * Obtener invitaciones de un evento
   */
  async obtenerInvitacionesEvento(req, res) {
    try {
      const { eventoId } = req.params;

      const invitaciones = await invitacionService.obtenerInvitacionesEvento(parseInt(eventoId));

      res.json({
        success: true,
        data: invitaciones
      });
    } catch (error) {
      console.error('Error en obtenerInvitacionesEvento:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener invitaciones',
        error: error.message
      });
    }
  }

  /**
   * GET /api/invitaciones/codigo/:codigo
   * Obtener invitación por código (público - RSVP)
   */
  async obtenerInvitacionPorCodigo(req, res) {
    try {
      const { codigo } = req.params;

      const invitacion = await invitacionService.obtenerInvitacionPorCodigo(codigo);

      if (!invitacion) {
        return res.status(404).json({
          success: false,
          message: 'Código de invitación no válido'
        });
      }

      res.json({
        success: true,
        data: invitacion
      });
    } catch (error) {
      console.error('Error en obtenerInvitacionPorCodigo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener invitación',
        error: error.message
      });
    }
  }

  /**
   * POST /api/invitaciones/rsvp/:codigo/confirmar
   * Confirmar asistencia (público - RSVP)
   */
  async confirmarAsistencia(req, res) {
    try {
      const { codigo } = req.params;
      const datosConfirmacion = req.body;

      // Obtener IP y User Agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      await invitacionService.confirmarAsistencia(codigo, datosConfirmacion, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Asistencia confirmada exitosamente'
      });
    } catch (error) {
      console.error('Error en confirmarAsistencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al confirmar asistencia',
        error: error.message
      });
    }
  }

  /**
   * POST /api/invitaciones/rsvp/:codigo/rechazar
   * Rechazar invitación (público - RSVP)
   */
  async rechazarInvitacion(req, res) {
    try {
      const { codigo } = req.params;

      await invitacionService.rechazarInvitacion(codigo);

      res.json({
        success: true,
        message: 'Respuesta registrada'
      });
    } catch (error) {
      console.error('Error en rechazarInvitacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar respuesta',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/invitaciones/:invitacionId
   * Actualizar invitación
   */
  async actualizarInvitacion(req, res) {
    try {
      const { invitacionId } = req.params;
      const datos = req.body;

      await invitacionService.actualizarInvitacion(parseInt(invitacionId), datos);

      res.json({
        success: true,
        message: 'Invitación actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error en actualizarInvitacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar invitación',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/invitaciones/:invitacionId
   * Eliminar invitación
   */
  async eliminarInvitacion(req, res) {
    try {
      const { invitacionId } = req.params;

      await invitacionService.eliminarInvitacion(parseInt(invitacionId));

      res.json({
        success: true,
        message: 'Invitación eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error en eliminarInvitacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar invitación',
        error: error.message
      });
    }
  }

  /**
   * GET /api/invitaciones/estadisticas/:eventoId
   * Obtener estadísticas de invitaciones
   */
  async obtenerEstadisticas(req, res) {
    try {
      const { eventoId } = req.params;

      const estadisticas = await invitacionService.obtenerEstadisticas(parseInt(eventoId));

      res.json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      console.error('Error en obtenerEstadisticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  /**
   * GET /api/invitaciones/categoria/:eventoId
   * Obtener invitaciones por categoría
   */
  async obtenerPorCategoria(req, res) {
    try {
      const { eventoId } = req.params;

      const categorias = await invitacionService.obtenerPorCategoria(parseInt(eventoId));

      res.json({
        success: true,
        data: categorias
      });
    } catch (error) {
      console.error('Error en obtenerPorCategoria:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }
}

module.exports = new InvitacionController();
