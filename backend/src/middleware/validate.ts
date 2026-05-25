import { Request, Response, NextFunction } from 'express';

type FieldRule = {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
};

type Schema = Record<string, FieldRule>;

export const validateBody = (schema: Schema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const val = req.body[field];

      if (rule.required && (val === undefined || val === null || val === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (val === undefined || val === null) continue;

      if (rule.type === 'string' && typeof val !== 'string') {
        errors[field] = `${field} must be a string`;
      } else if (rule.type === 'string') {
        if (rule.min && val.length < rule.min) errors[field] = `${field} min length ${rule.min}`;
        if (rule.max && val.length > rule.max) errors[field] = `${field} max length ${rule.max}`;
        if (rule.pattern && !rule.pattern.test(val)) errors[field] = `${field} format invalid`;
        if (rule.enum && !rule.enum.includes(val)) errors[field] = `${field} must be one of: ${rule.enum.join(', ')}`;
      } else if (rule.type === 'number' && typeof val !== 'number') {
        errors[field] = `${field} must be a number`;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ success: false, message: 'Validation failed', errors });
      return;
    }

    next();
  };
