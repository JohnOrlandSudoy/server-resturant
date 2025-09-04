import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { supabaseService } from '../services/supabaseService';
import { WebSocketMessage, OrderStatusUpdate, InventoryUpdate } from '../types';

export function setupWebSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join role-specific rooms
    socket.on('join-room', (data: { role: string; userId: string }) => {
      socket.join(`role-${data.role}`);
      socket.join(`user-${data.userId}`);
      logger.info(`User ${data.userId} joined room: role-${data.role}`);
    });

    // Order events
    socket.on('order-created', async (order: any) => {
      try {
        // Notify kitchen
        socket.to('role-kitchen').emit('new-order', order);
        // Notify admin
        socket.to('role-admin').emit('order-created', order);
        
        logger.info(`Order created: ${order.orderNumber}`);
      } catch (error) {
        logger.error('Order created event error:', error);
      }
    });

    socket.on('order-status-updated', async (data: OrderStatusUpdate) => {
      try {
        // Update order status in database
        await supabaseService().updateOrderStatus(data.orderId, data.status, data.updatedBy || 'system', data.notes);
        
        // Notify cashier
        socket.to('role-cashier').emit('order-status-changed', data);
        // Notify admin
        socket.to('role-admin').emit('order-updated', data);
        
        logger.info(`Order status updated: ${data.orderId} -> ${data.status}`);
      } catch (error) {
        logger.error('Order status update event error:', error);
      }
    });

    // Inventory events
    socket.on('inventory-updated', async (data: InventoryUpdate) => {
      try {
        // Update inventory in database
        await supabaseService().updateIngredientStock(data.ingredientId, data.quantity);
        
        // Notify all roles
        socket.to('role-admin').emit('inventory-changed', data);
        socket.to('role-kitchen').emit('ingredient-updated', data);
        
        logger.info(`Inventory updated: ${data.ingredientId} -> ${data.quantity}`);
      } catch (error) {
        logger.error('Inventory update event error:', error);
      }
    });

    // Sync events
    socket.on('sync-request', (data: any) => {
      socket.to('role-admin').emit('sync-needed', data);
      logger.info(`Sync requested by: ${data.deviceId}`);
    });

    // Device registration
    socket.on('register-device', async (deviceData: any) => {
      try {
        const result = await supabaseService().registerDevice(deviceData);
        if (result.success) {
          socket.emit('device-registered', result.data);
          logger.info(`Device registered: ${deviceData.deviceId}`);
        } else {
          socket.emit('device-registration-failed', result.error);
        }
      } catch (error) {
        logger.error('Device registration error:', error);
        socket.emit('device-registration-failed', 'Registration failed');
      }
    });

    // Health check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    // Error handling
    socket.on('error', (error: any) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  // Broadcast to all connected clients
  io.on('broadcast', (message: WebSocketMessage) => {
    io.emit(message.type, message.payload);
    logger.info(`Broadcast sent: ${message.type}`);
  });

  // Send to specific role
  io.on('send-to-role', (role: string, message: WebSocketMessage) => {
    io.to(`role-${role}`).emit(message.type, message.payload);
    logger.info(`Message sent to role ${role}: ${message.type}`);
  });

  // Send to specific user
  io.on('send-to-user', (userId: string, message: WebSocketMessage) => {
    io.to(`user-${userId}`).emit(message.type, message.payload);
    logger.info(`Message sent to user ${userId}: ${message.type}`);
  });
}

// Helper functions for external use
export const broadcastToRole = (io: Server, role: string, event: string, data: any): void => {
  io.to(`role-${role}`).emit(event, data);
  logger.info(`Broadcast to role ${role}: ${event}`);
};

export const broadcastToUser = (io: Server, userId: string, event: string, data: any): void => {
  io.to(`user-${userId}`).emit(event, data);
  logger.info(`Broadcast to user ${userId}: ${event}`);
};

export const broadcastToAll = (io: Server, event: string, data: any): void => {
  io.emit(event, data);
  logger.info(`Broadcast to all: ${event}`);
};
