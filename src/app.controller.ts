import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PublicApi } from './auth/decorators/role.decorator';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  private inviteTemplate: string;

  constructor() {
    // dist/templates/invite.html 경로로 접근
    this.inviteTemplate = readFileSync(
      join(process.cwd(), 'dist', 'templates', 'invite.html'),
      'utf-8',
    );
  }

  @Get('/health')
  getHello(): string {
    return 'health';
  }

  @PublicApi()
  @Get('/invite/:token')
  getInvitePage(@Param('token') token: string, @Res() res: Response) {
    const html = this.inviteTemplate.replace('{{TOKEN}}', token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
