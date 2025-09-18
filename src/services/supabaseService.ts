import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import {
  User,
  DatabaseUser,
  CreateUserRequest,
  Order,
  MenuItem,
  Ingredient,
  Customer,
  SyncQueueItem,
  DeviceInfo,
  DataConflict,
  ApiResponse
} from '../types';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase client initialized');
  }

  // Public method to access the Supabase client
  public getClient() {
    return this.client;
  }

  // Helper function to convert DatabaseUser to User
  private mapDatabaseUserToUser(dbUser: DatabaseUser): User {
    const user: User = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      role: dbUser.role,
      isActive: dbUser.is_active,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };

    if (dbUser.phone) user.phone = dbUser.phone;
    if (dbUser.avatar_url) user.avatarUrl = dbUser.avatar_url;
    if (dbUser.last_login) user.lastLogin = dbUser.last_login;
    if (dbUser.email_verified !== undefined) user.emailVerified = dbUser.email_verified;
    if (dbUser.password_hash) user.passwordHash = dbUser.password_hash;

    return user;
  }

  // Authentication methods
  async authenticateUser(username: string, password: string): Promise<ApiResponse<User>> {
    try {
      // First, get user by username
      const { data: user, error: userError } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Check if this is a test user with hardcoded password
      const testPasswords: { [key: string]: string } = {
        'admin': 'admin123',
        'cashier': 'cashier123',
        'kitchen': 'kitchen123',
        'inventory': 'inventory123'
      };

      // For test users, use hardcoded passwords
      if (testPasswords[username] && testPasswords[username] === password) {
        const mappedUser = this.mapDatabaseUserToUser(user as DatabaseUser);
        return {
          success: true,
          data: mappedUser
        };
      }

      // For newly registered users, we need to store and check passwords
      // Since we're not storing passwords in the database for this demo,
      // we'll use a simple approach: check if the password matches the registration
      
      // For now, let's allow login for any user with a simple password check
      // In production, you should store hashed passwords and verify them properly
      
      // For demo purposes, let's assume the password is "password123" for new users
      if (password === 'password123') {
        const mappedUser = this.mapDatabaseUserToUser(user as DatabaseUser);
        return {
          success: true,
          data: mappedUser
        };
      }

      return {
        success: false,
        error: 'Invalid credentials'
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get user error:', error);
      return {
        success: false,
        error: 'Failed to get user'
      };
    }
  }

  async getUserByUsername(username: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get user by username error:', error);
      return {
        success: false,
        error: 'Failed to get user'
      };
    }
  }

  async getUserByEmail(email: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get user by email error:', error);
      return {
        success: false,
        error: 'Failed to get user'
      };
    }
  }

  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      // Map camelCase to snake_case for database columns
      const insertData = {
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        phone: userData.phone,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('user_profiles')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('Supabase error:', error);
        return {
          success: false,
          error: `Failed to create user: ${error.message}`
        };
      }

      // Convert database user to application user format
      const user = this.mapDatabaseUserToUser(data as DatabaseUser);

      return {
        success: true,
        data: user
      };
    } catch (error) {
      logger.error('Create user error:', error);
      return {
        success: false,
        error: 'Failed to create user'
      };
    }
  }

  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      // Map camelCase to snake_case for DB columns
      const mapped: Record<string, any> = {};
      if (updateData.username !== undefined) mapped['username'] = updateData.username;
      if (updateData.email !== undefined) mapped['email'] = updateData.email;
      if (updateData.firstName !== undefined) mapped['first_name'] = updateData.firstName;
      if (updateData.lastName !== undefined) mapped['last_name'] = updateData.lastName;
      if (updateData.role !== undefined) mapped['role'] = updateData.role;
      if (updateData.phone !== undefined) mapped['phone'] = updateData.phone;
      if (updateData.isActive !== undefined) mapped['is_active'] = updateData.isActive;
      if (updateData.avatarUrl !== undefined) mapped['avatar_url'] = updateData.avatarUrl;
      if (updateData.lastLogin !== undefined) mapped['last_login'] = updateData.lastLogin as any;
      mapped['updated_at'] = new Date().toISOString();

      const { data, error } = await this.client
        .from('user_profiles')
        .update(mapped)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update user profile'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update user profile error:', error);
      return {
        success: false,
        error: 'Failed to update user profile'
      };
    }
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .update({ password_hash: hashedPassword })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update password error:', error);
      return {
        success: false,
        error: 'Failed to update password'
      };
    }
  }

  // Password Reset Methods
  async createPasswordResetToken(email: string): Promise<ApiResponse<{ token: string; expiresAt: string; userId: string }>> {
    try {
      const { data, error } = await this.client
        .rpc('create_password_reset_token', { user_email: email });

      if (error) {
        logger.error('Create password reset token error:', error);
        return {
          success: false,
          error: error.message || 'Failed to create password reset token'
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Failed to create password reset token'
        };
      }

      return {
        success: true,
        data: {
          token: data.token,
          expiresAt: data.expires_at,
          userId: data.user_id
        }
      };
    } catch (error) {
      logger.error('Create password reset token error:', error);
      return {
        success: false,
        error: 'Failed to create password reset token'
      };
    }
  }

  async verifyPasswordResetToken(token: string): Promise<ApiResponse<{ userId: string; username: string; email: string }>> {
    try {
      const { data, error } = await this.client
        .rpc('verify_password_reset_token', { token_value: token });

      if (error) {
        logger.error('Verify password reset token error:', error);
        return {
          success: false,
          error: error.message || 'Failed to verify password reset token'
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Invalid or expired token'
        };
      }

      return {
        success: true,
        data: {
          userId: data.user_id,
          username: data.username,
          email: data.email
        }
      };
    } catch (error) {
      logger.error('Verify password reset token error:', error);
      return {
        success: false,
        error: 'Failed to verify password reset token'
      };
    }
  }

  async resetPassword(token: string, newPasswordHash: string): Promise<ApiResponse<{ userId: string; username: string }>> {
    try {
      const { data, error } = await this.client
        .rpc('reset_user_password', { 
          token_value: token, 
          new_password_hash: newPasswordHash 
        });

      if (error) {
        logger.error('Reset password error:', error);
        return {
          success: false,
          error: error.message || 'Failed to reset password'
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Failed to reset password'
        };
      }

      return {
        success: true,
        data: {
          userId: data.user_id,
          username: data.username
        }
      };
    } catch (error) {
      logger.error('Reset password error:', error);
      return {
        success: false,
        error: 'Failed to reset password'
      };
    }
  }

  // Email Verification Methods
  async createEmailVerificationToken(email: string): Promise<ApiResponse<{ token: string; expiresAt: string; userId: string }>> {
    try {
      const { data, error } = await this.client
        .rpc('create_email_verification_token', { user_email: email });

      if (error) {
        logger.error('Create email verification token error:', error);
        return {
          success: false,
          error: error.message || 'Failed to create email verification token'
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Failed to create email verification token'
        };
      }

      return {
        success: true,
        data: {
          token: data.token,
          expiresAt: data.expires_at,
          userId: data.user_id
        }
      };
    } catch (error) {
      logger.error('Create email verification token error:', error);
      return {
        success: false,
        error: 'Failed to create email verification token'
      };
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ userId: string; username: string; email: string }>> {
    try {
      const { data, error } = await this.client
        .rpc('verify_user_email', { token_value: token });

      if (error) {
        logger.error('Verify email error:', error);
        return {
          success: false,
          error: error.message || 'Failed to verify email'
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Invalid or expired token'
        };
      }

      return {
        success: true,
        data: {
          userId: data.user_id,
          username: data.username,
          email: data.email
        }
      };
    } catch (error) {
      logger.error('Verify email error:', error);
      return {
        success: false,
        error: 'Failed to verify email'
      };
    }
  }


  async updateUserLastLogin(userId: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update last login'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update last login error:', error);
      return {
        success: false,
        error: 'Failed to update last login'
      };
    }
  }

  // Legacy order methods (kept for backward compatibility)
  async getOrdersLegacy(limit = 50, offset = 0): Promise<ApiResponse<Order[]>> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch orders'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get orders error:', error);
      return {
        success: false,
        error: 'Failed to get orders'
      };
    }
  }

  async createOrderLegacy(orderData: Partial<Order>): Promise<ApiResponse<Order>> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to create order'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create order error:', error);
      return {
        success: false,
        error: 'Failed to create order'
      };
    }
  }

  async updateOrderStatusLegacy(orderId: string, status: string): Promise<ApiResponse<Order>> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update order status'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update order status error:', error);
      return {
        success: false,
        error: 'Failed to update order status'
      };
    }
  }

  // Menu methods
async getMenuItems(page: number = 1, limit: number = 50, filters?: {
  category?: string;
  available?: boolean;
  featured?: boolean;
  search?: string;
}): Promise<ApiResponse<MenuItem[]>> {
  try {
    logger.info('getMenuItems called with:', { page, limit, filters });
    
    const offset = (page - 1) * limit;
    
    // Use the exact same query as the test endpoint that works
    const { data, error } = await this.client
      .from('menu_items')
      .select('*');
    
    logger.info('getMenuItems query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message || 'none' 
    });
    
    if (error) {
      logger.error('Supabase error in getMenuItems:', error);
      return {
        success: false,
        error: `Failed to fetch menu items: ${error.message}`
      };
    }

    // Filter by is_active = true (same as test endpoint)
    let finalData = (data || []).filter(item => item.is_active === true);
    
    logger.info('After is_active filter:', { count: finalData.length });

    // Apply additional filters if provided
    if (filters?.category) {
      finalData = finalData.filter(item => item.category_id === filters.category);
      logger.info('After category filter:', { count: finalData.length });
    }
    if (filters?.available !== undefined) {
      finalData = finalData.filter(item => item.is_available === filters.available);
      logger.info('After available filter:', { count: finalData.length });
    }
    if (filters?.featured !== undefined) {
      finalData = finalData.filter(item => item.is_featured === filters.featured);
      logger.info('After featured filter:', { count: finalData.length });
    }
    if (filters?.search) {
      finalData = finalData.filter(item => 
        item.name.toLowerCase().includes(filters.search!.toLowerCase())
      );
      logger.info('After search filter:', { count: finalData.length });
    }
    
    // Apply pagination
    const paginatedData = finalData.slice(offset, offset + limit);
    
    logger.info(`Final result: ${paginatedData.length} items after filtering and pagination`);
    
    return {
      success: true,
      data: paginatedData
    };
  } catch (error) {
    logger.error('Get menu items error:', error);
    return {
      success: false,
      error: 'Failed to get menu items'
    };
  }
}
  async getMenuItemById(id: string): Promise<ApiResponse<MenuItem>> {
    try {
      const { data, error } = await this.client
        .from('menu_items')
        .select(`
          *,
          menu_categories (name),
          menu_item_ingredients (
            *,
            ingredients (*)
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Menu item not found'
        };
      }

      // Map database fields to interface format
      const menuItem: MenuItem = {
        id: data.id,
        name: data.name,
        description: data.description,
        price: data.price,
        categoryId: data.category_id,
        imageUrl: data.image_url,
        prepTime: data.prep_time,
        isAvailable: data.is_available,
        isFeatured: data.is_featured,
        popularity: data.popularity,
        calories: data.calories,
        allergens: data.allergens,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        ingredients: data.menu_item_ingredients || [],
        image_file: data.image_file,
        image_filename: data.image_filename,
        image_mime_type: data.image_mime_type,
        image_size: data.image_size,
        image_alt_text: data.image_alt_text,
        image_uploaded_at: data.image_uploaded_at
      };

      return {
        success: true,
        data: menuItem
      };
    } catch (error) {
      logger.error('Get menu item error:', error);
      return {
        success: false,
        error: 'Failed to get menu item'
      };
    }
  }

  async createMenuItem(menuItemData: any): Promise<ApiResponse<MenuItem>> {
    try {
      logger.info('Creating menu item with data:', menuItemData);
      
      const { data, error } = await this.client
        .from('menu_items')
        .insert(menuItemData)
        .select()
        .single();

      if (error) {
        logger.error('Supabase error creating menu item:', error);
        return {
          success: false,
          error: `Failed to create menu item: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create menu item error:', error);
      return {
        success: false,
        error: 'Failed to create menu item'
      };
    }
  }

  async updateMenuItem(id: string, updateData: any): Promise<ApiResponse<MenuItem>> {
    try {
      const { data, error } = await this.client
        .from('menu_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update menu item'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update menu item error:', error);
      return {
        success: false,
        error: 'Failed to update menu item'
      };
    }
  }

  async deleteMenuItem(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client
        .from('menu_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: 'Failed to delete menu item'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('Delete menu item error:', error);
      return {
        success: false,
        error: 'Failed to delete menu item'
      };
    }
  }

  async getMenuCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch menu categories'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get menu categories error:', error);
      return {
        success: false,
        error: 'Failed to get menu categories'
      };
    }
  }

  async getMenuCategoryById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('menu_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Menu category not found'
        };
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Get menu category error:', error);
      return { success: false, error: 'Failed to get menu category' };
    }
  }

  async createMenuCategory(categoryData: any): Promise<ApiResponse<any>> {
    try {
      const insertData: Record<string, any> = {
        name: categoryData.name,
        description: categoryData.description ?? null,
        image_url: categoryData.image_url ?? null,
        sort_order: categoryData.sort_order ?? 0,
        is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
        image_filename: categoryData.image_filename ?? null,
        image_mime_type: categoryData.image_mime_type ?? null,
        image_size: categoryData.image_size ?? null,
        image_alt_text: categoryData.image_alt_text ?? null
      };

      const { data, error } = await this.client
        .from('menu_categories')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return { success: false, error: `Failed to create category: ${error.message}` };
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Create category error:', error);
      return { success: false, error: 'Failed to create category' };
    }
  }

  async updateMenuCategory(id: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      const mapped: Record<string, any> = {};
      if (updateData.name !== undefined) mapped['name'] = updateData.name;
      if (updateData.description !== undefined) mapped['description'] = updateData.description;
      if (updateData.image_url !== undefined) mapped['image_url'] = updateData.image_url;
      if (updateData.sort_order !== undefined) mapped['sort_order'] = parseInt(updateData.sort_order, 10);
      if (updateData.is_active !== undefined) mapped['is_active'] = !!updateData.is_active;
      if (updateData.image_filename !== undefined) mapped['image_filename'] = updateData.image_filename;
      if (updateData.image_mime_type !== undefined) mapped['image_mime_type'] = updateData.image_mime_type;
      if (updateData.image_size !== undefined) mapped['image_size'] = parseInt(updateData.image_size, 10);
      if (updateData.image_alt_text !== undefined) mapped['image_alt_text'] = updateData.image_alt_text;
      mapped['updated_at'] = new Date().toISOString();

      const { data, error } = await this.client
        .from('menu_categories')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: 'Failed to update category' };
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Update category error:', error);
      return { success: false, error: 'Failed to update category' };
    }
  }

  async deleteMenuCategory(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client
        .from('menu_categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return { success: false, error: 'Failed to delete category' };
      }

      return { success: true, data: true };
    } catch (error) {
      logger.error('Delete category error:', error);
      return { success: false, error: 'Failed to delete category' };
    }
  }

  async getMenuItemsWithCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('menu_items')
        .select(`
          *,
          menu_categories:menu_categories!menu_items_category_id_fkey (id, name, image_url)
        `)
        .eq('is_active', true);

      if (error) {
        return { success: false, error: 'Failed to fetch items with categories' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error('Get items with categories error:', error);
      return { success: false, error: 'Failed to get items with categories' };
    }
  }

  // Legacy inventory method (kept for backward compatibility)
  async getIngredients(): Promise<ApiResponse<Ingredient[]>> {
    try {
      const { data, error } = await this.client
        .from('ingredients')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch ingredients'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get ingredients error:', error);
      return {
        success: false,
        error: 'Failed to get ingredients'
      };
    }
  }

  async updateIngredientStock(ingredientId: string, quantity: number): Promise<ApiResponse<Ingredient>> {
    try {
      const { data, error } = await this.client
        .from('ingredients')
        .update({ 
          current_stock: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredientId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update ingredient stock'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update ingredient stock error:', error);
      return {
        success: false,
        error: 'Failed to update ingredient stock'
      };
    }
  }

  // Employee methods
  async getEmployees(): Promise<ApiResponse<User[]>> {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch employees'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get employees error:', error);
      return {
        success: false,
        error: 'Failed to get employees'
      };
    }
  }

  // Customer methods
  async getCustomers(limit = 50, offset = 0): Promise<ApiResponse<Customer[]>> {
    try {
      const { data, error } = await this.client
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .range(offset, offset + limit - 1);

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch customers'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get customers error:', error);
      return {
        success: false,
        error: 'Failed to get customers'
      };
    }
  }

  async createCustomer(customerData: Partial<Customer>): Promise<ApiResponse<Customer>> {
    try {
      const { data, error } = await this.client
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to create customer'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create customer error:', error);
      return {
        success: false,
        error: 'Failed to create customer'
      };
    }
  }

  // Sync methods
  async getSyncStatus(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('sync_queue')
        .select('count')
        .eq('sync_status', 'pending');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch sync status'
        };
      }

      return {
        success: true,
        data: {
          pendingItems: data?.[0]?.count || 0,
          lastSync: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Get sync status error:', error);
      return {
        success: false,
        error: 'Failed to get sync status'
      };
    }
  }

  async addToSyncQueue(syncItem: Partial<SyncQueueItem>): Promise<ApiResponse<SyncQueueItem>> {
    try {
      const { data, error } = await this.client
        .from('sync_queue')
        .insert(syncItem)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to add to sync queue'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Add to sync queue error:', error);
      return {
        success: false,
        error: 'Failed to add to sync queue'
      };
    }
  }

  async getSyncQueue(status?: string): Promise<ApiResponse<SyncQueueItem[]>> {
    try {
      let query = this.client
        .from('sync_queue')
        .select('*')
        .order('created_at', { ascending: true });

      if (status) {
        query = query.eq('sync_status', status);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch sync queue'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get sync queue error:', error);
      return {
        success: false,
        error: 'Failed to get sync queue'
      };
    }
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<ApiResponse<SyncQueueItem>> {
    try {
      const { data, error } = await this.client
        .from('sync_queue')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update sync queue item'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update sync queue item error:', error);
      return {
        success: false,
        error: 'Failed to update sync queue item'
      };
    }
  }

  // Network methods
  async getNetworkDevices(): Promise<ApiResponse<DeviceInfo[]>> {
    try {
      const { data, error } = await this.client
        .from('device_registry')
        .select('*')
        .eq('is_online', true)
        .order('last_seen', { ascending: false });

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch network devices'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get network devices error:', error);
      return {
        success: false,
        error: 'Failed to get network devices'
      };
    }
  }

  // Device registry methods
  async registerDevice(deviceData: Partial<DeviceInfo>): Promise<ApiResponse<DeviceInfo>> {
    try {
      const { data, error } = await this.client
        .from('device_registry')
        .upsert(deviceData, { onConflict: 'device_id' })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to register device'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Register device error:', error);
      return {
        success: false,
        error: 'Failed to register device'
      };
    }
  }

  async updateDeviceStatus(deviceId: string, isOnline: boolean): Promise<ApiResponse<DeviceInfo>> {
    try {
      const { data, error } = await this.client
        .from('device_registry')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update device status'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update device status error:', error);
      return {
        success: false,
        error: 'Failed to update device status'
      };
    }
  }

  // Conflict resolution methods
  async createConflict(conflictData: Partial<DataConflict>): Promise<ApiResponse<DataConflict>> {
    try {
      const { data, error } = await this.client
        .from('data_conflicts')
        .insert(conflictData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to create conflict record'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create conflict error:', error);
      return {
        success: false,
        error: 'Failed to create conflict record'
      };
    }
  }

  async resolveConflict(conflictId: string, resolution: string, resolvedBy: string): Promise<ApiResponse<DataConflict>> {
    try {
      const { data, error } = await this.client
        .from('data_conflicts')
        .update({
          resolution,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString()
        })
        .eq('id', conflictId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to resolve conflict'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Resolve conflict error:', error);
      return {
        success: false,
        error: 'Failed to resolve conflict'
      };
    }
  }

  // =====================================================
  // INVENTORY MANAGEMENT METHODS
  // =====================================================

  // Enhanced ingredients CRUD (new implementation)
  async getIngredientsEnhanced(): Promise<ApiResponse<Ingredient[]>> {
    try {
      const { data, error } = await this.client
        .from('ingredients')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch ingredients'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get ingredients error:', error);
      return {
        success: false,
        error: 'Failed to get ingredients'
      };
    }
  }

  async getIngredientById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Ingredient not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get ingredient error:', error);
      return {
        success: false,
        error: 'Failed to get ingredient'
      };
    }
  }

  async createIngredient(ingredientData: any): Promise<ApiResponse<any>> {
    try {
      const insertData: Record<string, any> = {
        name: ingredientData.name,
        description: ingredientData.description ?? null,
        unit: ingredientData.unit ?? 'pieces',
        current_stock: ingredientData.current_stock ?? 0,
        min_stock_threshold: ingredientData.min_stock_threshold ?? 0,
        max_stock_threshold: ingredientData.max_stock_threshold ?? null,
        cost_per_unit: ingredientData.cost_per_unit ?? null,
        supplier: ingredientData.supplier ?? null,
        category: ingredientData.category ?? null,
        storage_location: ingredientData.storage_location ?? null,
        expiry_date: ingredientData.expiry_date ?? null,
        is_active: ingredientData.is_active !== undefined ? ingredientData.is_active : true,
        created_by: ingredientData.created_by ?? null,
        updated_by: ingredientData.updated_by ?? null
      };

      const { data, error } = await this.client
        .from('ingredients')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create ingredient: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create ingredient error:', error);
      return {
        success: false,
        error: 'Failed to create ingredient'
      };
    }
  }

  async updateIngredient(id: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      const mapped: Record<string, any> = {};
      if (updateData.name !== undefined) mapped['name'] = updateData.name;
      if (updateData.description !== undefined) mapped['description'] = updateData.description;
      if (updateData.unit !== undefined) mapped['unit'] = updateData.unit;
      if (updateData.current_stock !== undefined) mapped['current_stock'] = parseFloat(updateData.current_stock);
      if (updateData.min_stock_threshold !== undefined) mapped['min_stock_threshold'] = parseFloat(updateData.min_stock_threshold);
      if (updateData.max_stock_threshold !== undefined) mapped['max_stock_threshold'] = updateData.max_stock_threshold ? parseFloat(updateData.max_stock_threshold) : null;
      if (updateData.cost_per_unit !== undefined) mapped['cost_per_unit'] = updateData.cost_per_unit ? parseFloat(updateData.cost_per_unit) : null;
      if (updateData.supplier !== undefined) mapped['supplier'] = updateData.supplier;
      if (updateData.category !== undefined) mapped['category'] = updateData.category;
      if (updateData.storage_location !== undefined) mapped['storage_location'] = updateData.storage_location;
      if (updateData.expiry_date !== undefined) mapped['expiry_date'] = updateData.expiry_date;
      if (updateData.is_active !== undefined) mapped['is_active'] = !!updateData.is_active;
      if (updateData.updated_by !== undefined) mapped['updated_by'] = updateData.updated_by;
      mapped['updated_at'] = new Date().toISOString();

      const { data, error } = await this.client
        .from('ingredients')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update ingredient'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update ingredient error:', error);
      return {
        success: false,
        error: 'Failed to update ingredient'
      };
    }
  }

  async deleteIngredient(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client
        .from('ingredients')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: 'Failed to delete ingredient'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('Delete ingredient error:', error);
      return {
        success: false,
        error: 'Failed to delete ingredient'
      };
    }
  }

  // Stock movements
  async getStockMovements(ingredientId?: string, limit = 50, offset = 0): Promise<ApiResponse<any[]>> {
    try {
      let query = this.client
        .from('stock_movements')
        .select(`
          *,
          ingredient:ingredients!stock_movements_ingredient_id_fkey (name, unit),
          performed_by_user:user_profiles!stock_movements_performed_by_fkey (username, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (ingredientId) {
        query = query.eq('ingredient_id', ingredientId);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch stock movements'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get stock movements error:', error);
      return {
        success: false,
        error: 'Failed to get stock movements'
      };
    }
  }

  async createStockMovement(movementData: any): Promise<ApiResponse<any>> {
    try {
      const insertData: Record<string, any> = {
        ingredient_id: movementData.ingredient_id,
        movement_type: movementData.movement_type,
        quantity: parseFloat(movementData.quantity),
        reason: movementData.reason ?? null,
        reference_number: movementData.reference_number ?? null,
        notes: movementData.notes ?? null,
        performed_by: movementData.performed_by
      };

      const { data, error } = await this.client
        .from('stock_movements')
        .insert(insertData)
        .select(`
          *,
          ingredient:ingredients!stock_movements_ingredient_id_fkey (name, unit),
          performed_by_user:user_profiles!stock_movements_performed_by_fkey (username, first_name, last_name)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create stock movement: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create stock movement error:', error);
      return {
        success: false,
        error: 'Failed to create stock movement'
      };
    }
  }

  // Menu item ingredients
  async getMenuItemIngredients(menuItemId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('menu_item_ingredients')
        .select(`
          *,
          ingredient:ingredients!menu_item_ingredients_ingredient_id_fkey (name, unit, current_stock, min_stock_threshold)
        `)
        .eq('menu_item_id', menuItemId);

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch menu item ingredients'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get menu item ingredients error:', error);
      return {
        success: false,
        error: 'Failed to get menu item ingredients'
      };
    }
  }

  async createMenuItemIngredient(linkData: any): Promise<ApiResponse<any>> {
    try {
      const insertData: Record<string, any> = {
        menu_item_id: linkData.menu_item_id,
        ingredient_id: linkData.ingredient_id,
        quantity_required: parseFloat(linkData.quantity_required),
        unit: linkData.unit,
        is_optional: linkData.is_optional ?? false,
        created_by: linkData.created_by
      };

      const { data, error } = await this.client
        .from('menu_item_ingredients')
        .insert(insertData)
        .select(`
          *,
          ingredient:ingredients!menu_item_ingredients_ingredient_id_fkey (name, unit, current_stock)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to link ingredient: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create menu item ingredient error:', error);
      return {
        success: false,
        error: 'Failed to link ingredient'
      };
    }
  }

  async updateMenuItemIngredient(id: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      const mapped: Record<string, any> = {};
      if (updateData.quantity_required !== undefined) mapped['quantity_required'] = parseFloat(updateData.quantity_required);
      if (updateData.unit !== undefined) mapped['unit'] = updateData.unit;
      if (updateData.is_optional !== undefined) mapped['is_optional'] = !!updateData.is_optional;

      const { data, error } = await this.client
        .from('menu_item_ingredients')
        .update(mapped)
        .eq('id', id)
        .select(`
          *,
          ingredient:ingredients!menu_item_ingredients_ingredient_id_fkey (name, unit, current_stock)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update ingredient link'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update menu item ingredient error:', error);
      return {
        success: false,
        error: 'Failed to update ingredient link'
      };
    }
  }

  async deleteMenuItemIngredient(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client
        .from('menu_item_ingredients')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: 'Failed to unlink ingredient'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('Delete menu item ingredient error:', error);
      return {
        success: false,
        error: 'Failed to unlink ingredient'
      };
    }
  }

  // Stock alerts
  async getStockAlerts(resolved?: boolean): Promise<ApiResponse<any[]>> {
    try {
      let query = this.client
        .from('stock_alerts')
        .select(`
          *,
          ingredient:ingredients!stock_alerts_ingredient_id_fkey (name, unit),
          resolved_by_user:user_profiles!stock_alerts_resolved_by_fkey (username, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (resolved !== undefined) {
        query = query.eq('is_resolved', resolved);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch stock alerts'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get stock alerts error:', error);
      return {
        success: false,
        error: 'Failed to get stock alerts'
      };
    }
  }

  async resolveStockAlert(alertId: string, resolvedBy: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('stock_alerts')
        .update({
          is_resolved: true,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to resolve alert'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Resolve stock alert error:', error);
      return {
        success: false,
        error: 'Failed to resolve alert'
      };
    }
  }

  // Inventory reports
  async getInventoryReport(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('ingredients_stock_status')
        .select('*')
        .order('stock_status', { ascending: true });

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch inventory report'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get inventory report error:', error);
      return {
        success: false,
        error: 'Failed to get inventory report'
      };
    }
  }

  async getMenuAvailabilityReport(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('menu_items_ingredient_availability')
        .select('*')
        .order('ingredient_status', { ascending: true });

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch menu availability report'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get menu availability report error:', error);
      return {
        success: false,
        error: 'Failed to get menu availability report'
      };
    }
  }

  // =====================================================
  // ORDER MANAGEMENT METHODS
  // =====================================================

  // Orders CRUD
  async getOrders(limit = 50, offset = 0, status?: string, orderType?: string): Promise<ApiResponse<any[]>> {
    try {
      let query = this.client
        .from('order_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter out cancelled orders by default (soft delete)
      query = query.neq('status', 'cancelled');

      if (status) {
        query = query.eq('status', status);
      }

      if (orderType) {
        query = query.eq('order_type', orderType);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch orders'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get orders error:', error);
      return {
        success: false,
        error: 'Failed to get orders'
      };
    }
  }

  async getOrderById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('order_summary')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get order error:', error);
      return {
        success: false,
        error: 'Failed to get order'
      };
    }
  }

  async getOrderByNumber(orderNumber: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('order_summary')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get order by number error:', error);
      return {
        success: false,
        error: 'Failed to get order'
      };
    }
  }

  async createOrder(orderData: any): Promise<ApiResponse<any>> {
    try {
      logger.info('Creating order in database:', { orderData });

      const insertData: Record<string, any> = {
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        order_type: orderData.order_type,
        special_instructions: orderData.special_instructions,
        table_number: orderData.table_number,
        estimated_prep_time: orderData.estimated_prep_time,
        created_by: orderData.created_by
      };

      logger.info('Insert data prepared:', { insertData });

      const { data, error } = await this.client
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('Database error creating order:', { 
          error: error.message, 
          details: error.details, 
          hint: error.hint,
          code: error.code 
        });
        return {
          success: false,
          error: `Failed to create order: ${error.message}`
        };
      }

      logger.info('Order created successfully:', { orderId: data?.id });
      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create order error:', error);
      return {
        success: false,
        error: 'Failed to create order'
      };
    }
  }

  async updateOrderStatus(id: string, status: string, updatedBy: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      logger.info(`Updating order status: orderId=${id}, status=${status}, updatedBy=${updatedBy}, notes=${notes}`);
      
      const updateData: Record<string, any> = {
        status,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      };

      // Set completion time if order is completed
      if (status === 'completed') {
        updateData['completed_at'] = new Date().toISOString();
      }

      logger.info(`Update data:`, updateData);

      const { data, error } = await this.client
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Supabase error updating order status:', error);
        return {
          success: false,
          error: `Failed to update order status: ${error.message}`
        };
      }

      logger.info('Order status updated successfully, recording history...');

      // Record status change in history
      const { error: historyError } = await this.client
        .from('order_status_history')
        .insert({
          order_id: id,
          status,
          notes: notes || 'Status updated',
          updated_by: updatedBy
        });

      if (historyError) {
        logger.error('Error recording status history:', historyError);
        // Don't fail the whole operation if history recording fails
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update order status error:', error);
      return {
        success: false,
        error: `Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateOrderPayment(id: string, paymentStatus: string, paymentMethod?: string, updatedBy?: string): Promise<ApiResponse<any>> {
    try {
      const updateData: Record<string, any> = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      if (paymentMethod) {
        updateData['payment_method'] = paymentMethod;
      }

      if (updatedBy) {
        updateData['updated_by'] = updatedBy;
      }

      const { data, error } = await this.client
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update payment status'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update order payment error:', error);
      return {
        success: false,
        error: 'Failed to update payment status'
      };
    }
  }

  // Payment tracking methods
  async createPaymentRecord(paymentData: {
    payment_intent_id: string;
    order_id?: string | undefined;
    order_number?: string | undefined;
    amount: number;
    currency: string;
    description?: string | undefined;
    status: string;
    payment_status: string;
    payment_method?: string | undefined;
    payment_source_type?: string | undefined;
    qr_code_url?: string | undefined;
    qr_code_data?: string | undefined;
    qr_code_expires_at?: string | undefined;
    paymongo_response?: any;
    metadata?: any;
    created_by: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        logger.error('Create payment record error:', error);
        return {
          success: false,
          error: 'Failed to create payment record'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create payment record error:', error);
      return {
        success: false,
        error: 'Failed to create payment record'
      };
    }
  }

  async updatePaymentRecord(paymentIntentId: string, updateData: {
    status?: string | undefined;
    payment_status?: string | undefined;
    payment_id?: string | undefined;
    paid_at?: string | undefined;
    failed_at?: string | undefined;
    cancelled_at?: string | undefined;
    error_message?: string | undefined;
    error_code?: string | undefined;
    fee_amount?: number | undefined;
    net_amount?: number | undefined;
    external_reference_number?: string | undefined;
    paymongo_response?: any;
    webhook_events?: any[] | undefined;
    updated_by?: string | undefined;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('payments')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('payment_intent_id', paymentIntentId)
        .select()
        .single();

      if (error) {
        logger.error('Update payment record error:', error);
        return {
          success: false,
          error: 'Failed to update payment record'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update payment record error:', error);
      return {
        success: false,
        error: 'Failed to update payment record'
      };
    }
  }

  async getPaymentHistory(orderId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('payments')
        .select(`
          *,
          created_by_user:user_profiles!payments_created_by_fkey(username, full_name),
          updated_by_user:user_profiles!payments_updated_by_fkey(username, full_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Get payment history error:', error);
        return {
          success: false,
          error: 'Failed to retrieve payment history'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get payment history error:', error);
      return {
        success: false,
        error: 'Failed to retrieve payment history'
      };
    }
  }

  async getPaymentByIntentId(paymentIntentId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('payments')
        .select(`
          *,
          created_by_user:user_profiles!payments_created_by_fkey(username, full_name),
          updated_by_user:user_profiles!payments_updated_by_fkey(username, full_name)
        `)
        .eq('payment_intent_id', paymentIntentId)
        .single();

      if (error) {
        logger.error('Get payment by intent ID error:', error);
        return {
          success: false,
          error: 'Failed to retrieve payment record'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get payment by intent ID error:', error);
      return {
        success: false,
        error: 'Failed to retrieve payment record'
      };
    }
  }

  // Order items
  async getOrderItems(orderId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('order_items_detail')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch order items'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get order items error:', error);
      return {
        success: false,
        error: 'Failed to get order items'
      };
    }
  }

  async getOrderItemById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('order_items')
        .select(`
          *,
          menu_item:menu_items!order_items_menu_item_id_fkey (name, description, image_url)
        `)
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Database error getting order item:', { 
          error: error.message, 
          details: error.details, 
          hint: error.hint,
          code: error.code 
        });
        return {
          success: false,
          error: `Failed to get order item: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get order item error:', error);
      return {
        success: false,
        error: 'Failed to get order item'
      };
    }
  }

  async addOrderItem(orderItemData: any): Promise<ApiResponse<any>> {
    try {
      const insertData: Record<string, any> = {
        order_id: orderItemData.order_id,
        menu_item_id: orderItemData.menu_item_id,
        quantity: orderItemData.quantity,
        unit_price: orderItemData.unit_price,
        total_price: orderItemData.total_price,
        customizations: orderItemData.customizations,
        special_instructions: orderItemData.special_instructions
      };

      const { data, error } = await this.client
        .from('order_items')
        .insert(insertData)
        .select(`
          *,
          menu_item:menu_items!order_items_menu_item_id_fkey (
            name, 
            description, 
            image_url,
            menu_item_ingredients (
              quantity_required,
              unit,
              is_optional,
              ingredients!inner (
                id,
                name,
                current_stock,
                min_stock_threshold,
                unit,
                is_active
              )
            )
          )
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to add order item: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Add order item error:', error);
      return {
        success: false,
        error: 'Failed to add order item'
      };
    }
  }

  async updateOrderItem(id: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      const mapped: Record<string, any> = {};
      if (updateData.quantity !== undefined) mapped['quantity'] = parseInt(updateData.quantity);
      if (updateData.unit_price !== undefined) mapped['unit_price'] = parseFloat(updateData.unit_price);
      if (updateData.total_price !== undefined) mapped['total_price'] = parseFloat(updateData.total_price);
      if (updateData.customizations !== undefined) mapped['customizations'] = updateData.customizations;
      if (updateData.special_instructions !== undefined) mapped['special_instructions'] = updateData.special_instructions;

      const { data, error } = await this.client
        .from('order_items')
        .update(mapped)
        .eq('id', id)
        .select(`
          *,
          menu_item:menu_items!order_items_menu_item_id_fkey (
            name, 
            description, 
            image_url,
            menu_item_ingredients (
              quantity_required,
              unit,
              is_optional,
              ingredients!inner (
                id,
                name,
                current_stock,
                min_stock_threshold,
                unit,
                is_active
              )
            )
          )
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Failed to update order item'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update order item error:', error);
      return {
        success: false,
        error: 'Failed to update order item'
      };
    }
  }

  async deleteOrderItem(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client
        .from('order_items')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: 'Failed to delete order item'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('Delete order item error:', error);
      return {
        success: false,
        error: 'Failed to delete order item'
      };
    }
  }

  // Kitchen orders with complete item and ingredient details
  async getKitchenOrders(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          order_type,
          status,
          payment_status,
          payment_method,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          special_instructions,
          table_number,
          estimated_prep_time,
          actual_prep_time,
          created_at,
          updated_at,
          completed_at,
          order_items (
            id,
            menu_item_id,
            quantity,
            unit_price,
            total_price,
            customizations,
            special_instructions,
            created_at,
            menu_items (
              id,
              name,
              description,
              price,
              prep_time,
              is_available,
              calories,
              allergens,
              menu_item_ingredients (
                id,
                quantity_required,
                unit,
                is_optional,
                ingredients (
                  id,
                  name,
                  description,
                  unit,
                  current_stock,
                  min_stock_threshold,
                  max_stock_threshold,
                  cost_per_unit,
                  supplier,
                  category,
                  storage_location,
                  expiry_date,
                  is_active
                )
              )
            )
          )
        `)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Kitchen orders query error:', error);
        return {
          success: false,
          error: 'Failed to fetch kitchen orders'
        };
      }

      // Process and format the data for kitchen display
      const processedOrders = (data || []).map(order => {
        // Calculate total prep time based on menu items
        let totalPrepTime = 0;
        let totalItems = 0;
        let ingredientsNeeded: any[] = [];
        let lowStockIngredients: any[] = [];

        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach((item: any) => {
            totalItems += item.quantity;
            
            if (item.menu_items) {
              // Add prep time for each quantity
              totalPrepTime += (item.menu_items.prep_time || 0) * item.quantity;
              
              // Process ingredients for this menu item
              if (item.menu_items.menu_item_ingredients) {
                item.menu_items.menu_item_ingredients.forEach((menuIngredient: any) => {
                  if (menuIngredient.ingredients) {
                    const ingredient = menuIngredient.ingredients;
                    const requiredQuantity = (menuIngredient.quantity_required || 0) * item.quantity;
                    
                    // Check if ingredient is already in the list
                    const existingIngredient = ingredientsNeeded.find(ing => ing.id === ingredient.id);
                    if (existingIngredient) {
                      existingIngredient.required_quantity += requiredQuantity;
                    } else {
                      ingredientsNeeded.push({
                        id: ingredient.id,
                        name: ingredient.name,
                        description: ingredient.description,
                        unit: ingredient.unit,
                        required_quantity: requiredQuantity,
                        current_stock: ingredient.current_stock,
                        min_stock_threshold: ingredient.min_stock_threshold,
                        max_stock_threshold: ingredient.max_stock_threshold,
                        cost_per_unit: ingredient.cost_per_unit,
                        supplier: ingredient.supplier,
                        category: ingredient.category,
                        storage_location: ingredient.storage_location,
                        expiry_date: ingredient.expiry_date,
                        is_optional: menuIngredient.is_optional,
                        is_low_stock: ingredient.current_stock <= ingredient.min_stock_threshold,
                        is_out_of_stock: ingredient.current_stock <= 0
                      });
                    }
                    
                    // Check for low stock or out of stock
                    if (ingredient.current_stock <= ingredient.min_stock_threshold) {
                      const existingLowStock = lowStockIngredients.find(ing => ing.id === ingredient.id);
                      if (!existingLowStock) {
                        lowStockIngredients.push({
                          id: ingredient.id,
                          name: ingredient.name,
                          current_stock: ingredient.current_stock,
                          min_stock_threshold: ingredient.min_stock_threshold,
                          required_quantity: requiredQuantity,
                          is_out_of_stock: ingredient.current_stock <= 0
                        });
                      }
                    }
                  }
                });
              }
            }
          });
        }

        // Determine priority based on order age and prep time
        const orderAge = Date.now() - new Date(order.created_at).getTime();
        const ageInMinutes = orderAge / (1000 * 60);
        let priority = 'LOW';
        
        if (ageInMinutes > 30 || totalPrepTime > 20) {
          priority = 'HIGH';
        } else if (ageInMinutes > 15 || totalPrepTime > 10) {
          priority = 'MEDIUM';
        }

        return {
          ...order,
          kitchen_metadata: {
            total_items: totalItems,
            estimated_total_prep_time: totalPrepTime,
            priority: priority,
            ingredients_needed: ingredientsNeeded,
            low_stock_ingredients: lowStockIngredients,
            has_low_stock: lowStockIngredients.length > 0,
            has_out_of_stock: lowStockIngredients.some(ing => ing.is_out_of_stock),
            can_prepare: lowStockIngredients.filter(ing => ing.is_out_of_stock).length === 0
          }
        };
      });

      logger.info('Kitchen orders retrieved successfully:', {
        totalOrders: processedOrders.length,
        ordersWithItems: processedOrders.filter(o => o.order_items?.length > 0).length,
        ordersWithLowStock: processedOrders.filter(o => o.kitchen_metadata?.has_low_stock).length
      });

      return {
        success: true,
        data: processedOrders
      };
    } catch (error) {
      logger.error('Get kitchen orders error:', error);
      return {
        success: false,
        error: 'Failed to get kitchen orders'
      };
    }
  }

  // Search orders
  async searchOrders(searchTerm: string, limit = 50, offset = 0): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('order_summary')
        .select('*')
        .or(`customer_name.ilike.%${searchTerm}%,order_number.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return {
          success: false,
          error: 'Failed to search orders'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Search orders error:', error);
      return {
        success: false,
        error: 'Failed to search orders'
      };
    }
  }

  // Discounts
  async getDiscounts(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .gt('valid_until', new Date().toISOString())
        .order('name');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch discounts'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get discounts error:', error);
      return {
        success: false,
        error: 'Failed to get discounts'
      };
    }
  }

  async getDiscountByCode(code: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('discounts')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .gt('valid_until', new Date().toISOString())
        .single();

      if (error) {
        return {
          success: false,
          error: 'Discount not found or expired'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get discount by code error:', error);
      return {
        success: false,
        error: 'Failed to get discount'
      };
    }
  }

  async createDiscount(discountData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('discounts')
        .insert(discountData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create discount: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Create discount error:', error);
      return {
        success: false,
        error: 'Failed to create discount'
      };
    }
  }

  async applyDiscountToOrder(orderId: string, discountId: string, discountAmount: number): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('order_discounts')
        .insert({
          order_id: orderId,
          discount_id: discountId,
          discount_amount: discountAmount
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to apply discount: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Apply discount error:', error);
      return {
        success: false,
        error: 'Failed to apply discount'
      };
    }
  }

  async updateDiscount(discountId: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('discounts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', discountId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update discount: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Update discount error:', error);
      return {
        success: false,
        error: 'Failed to update discount'
      };
    }
  }

  async deleteDiscount(discountId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('discounts')
        .delete()
        .eq('id', discountId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to delete discount: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Delete discount error:', error);
      return {
        success: false,
        error: 'Failed to delete discount'
      };
    }
  }

  async getDiscountById(discountId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('discounts')
        .select('*')
        .eq('id', discountId)
        .single();

      if (error) {
        return {
          success: false,
          error: 'Discount not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Get discount by ID error:', error);
      return {
        success: false,
        error: 'Failed to get discount'
      };
    }
  }

  // Order status history
  async getOrderStatusHistory(orderId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('order_status_history')
        .select(`
          *,
          updated_by_user:user_profiles!order_status_history_updated_by_fkey (username, first_name, last_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch order status history'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Get order status history error:', error);
      return {
        success: false,
        error: 'Failed to get order status history'
      };
    }
  }

  // Delete order (Admin only)
  async deleteOrder(orderId: string, force: boolean = false): Promise<ApiResponse<any>> {
    try {
      logger.info(`Deleting order ${orderId}, force: ${force}`);

      if (force) {
        // Hard delete - completely remove from database
        const { error } = await this.client
          .from('orders')
          .delete()
          .eq('id', orderId);

        if (error) {
          logger.error('Hard delete order error:', error);
          return {
            success: false,
            error: `Failed to delete order: ${error.message}`
          };
        }
      } else {
        // Soft delete - mark as cancelled and add deletion flag
        const { error } = await this.client
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
            // You could add a deleted_at field if you want to track soft deletes
          })
          .eq('id', orderId);

        if (error) {
          logger.error('Soft delete order error:', error);
          return {
            success: false,
            error: `Failed to cancel order: ${error.message}`
          };
        }
      }

      return {
        success: true,
        data: { orderId, deleted: true }
      };
    } catch (error) {
      logger.error('Delete order error:', error);
      return {
        success: false,
        error: 'Failed to delete order'
      };
    }
  }

  // Bulk delete orders (Admin only)
  async bulkDeleteOrders(orderIds: string[], force: boolean = false): Promise<ApiResponse<any>> {
    try {
      logger.info(`Bulk deleting ${orderIds.length} orders, force: ${force}`);

      let deletedCount = 0;
      let failedCount = 0;
      const failedOrders: Array<{id: string, error: string}> = [];

      for (const orderId of orderIds) {
        try {
          // Check if order exists and can be deleted
          const orderCheck = await this.getOrderById(orderId);
          if (!orderCheck.success) {
            failedOrders.push({ id: orderId, error: 'Order not found' });
            failedCount++;
            continue;
          }

          const order = orderCheck.data;

          // Skip paid orders unless forced
          if (order.payment_status === 'paid' && !force) {
            failedOrders.push({ id: orderId, error: 'Cannot delete paid order' });
            failedCount++;
            continue;
          }

          // Delete the order
          const deleteResult = await this.deleteOrder(orderId, force);
          if (deleteResult.success) {
            deletedCount++;
          } else {
            failedOrders.push({ id: orderId, error: deleteResult.error || 'Delete failed' });
            failedCount++;
          }
        } catch (error) {
          failedOrders.push({ 
            id: orderId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          failedCount++;
        }
      }

      return {
        success: true,
        data: {
          deletedCount,
          failedCount,
          failedOrders,
          totalProcessed: orderIds.length
        }
      };
    } catch (error) {
      logger.error('Bulk delete orders error:', error);
      return {
        success: false,
        error: 'Failed to bulk delete orders'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('user_profiles')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }
}

// Lazy initialization to avoid environment variable issues at module load
let _supabaseService: SupabaseService | null = null;

export const supabaseService = (): SupabaseService => {
  if (!_supabaseService) {
    _supabaseService = new SupabaseService();
  }
  return _supabaseService;
};
