import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod';

function toSchema(schema: ZodSchema, name?: string) {
  return zodToJsonSchema(schema as never, {
    target: 'openApi3',
    $refStrategy: 'none',
    ...(name ? { name } : {}),
  }) as Record<string, unknown>;
}

export function ApiZodBody(schema: ZodSchema, name = 'Body'): MethodDecorator {
  return applyDecorators(ApiBody({ schema: toSchema(schema, name) }));
}

export function ApiZodQuery(schema: ZodSchema, name = 'Query'): MethodDecorator {
  const json = toSchema(schema, name) as {
    properties?: Record<string, { description?: string }>;
    required?: string[];
  };
  return applyDecorators(
    ...Object.entries(json.properties ?? {}).map(([key, value]) =>
      ApiQuery({
        name: key,
        required: json.required?.includes(key) ?? false,
        schema: value as Record<string, unknown>,
      }),
    ),
  );
}

export function ApiZodResponse(schema: ZodSchema, description = 'Success'): MethodDecorator {
  return applyDecorators(
    ApiResponse({ status: 200, description, schema: toSchema(schema) }),
  );
}
