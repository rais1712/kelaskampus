// server/lib/utils/validators.ts

/**
 * Validation utilities for request data
 */

export class Validators {
  
  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate session ID
   */
  static isValidSessionId(sessionId: string): boolean {
    return this.isValidUUID(sessionId);
  }

  /**
   * Validate user ID
   */
  static isValidUserId(userId: string): boolean {
    return this.isValidUUID(userId);
  }

  /**
   * Validate kategori ID
   */
  static isValidKategoriId(kategoriId: string): boolean {
    const validKategoris = ['kpu', 'ppu', 'pk', 'pm', 'lit-id', 'lit-en', 'kmbm'];
    return validKategoris.includes(kategoriId);
  }

  /**
   * Validate risk preference
   */
  static isValidRiskPreference(risk: string): boolean {
    return ['conservative', 'moderate', 'aggressive'].includes(risk);
  }

  /**
   * Validate rumpun
   */
  static isValidRumpun(rumpun: string): boolean {
    return ['Saintek', 'Soshum', 'Campuran'].includes(rumpun);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate and parse JSON
   */
  static parseJSON<T>(jsonString: string, defaultValue: T): T {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  }
}
