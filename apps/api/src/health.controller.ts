import { Controller, Get } from '@nestjs/common';
@Controller('health')
export class HealthController { @Get() get() { return { status: 'ok', service: 'seven-ai-search-community-api' }; } }
