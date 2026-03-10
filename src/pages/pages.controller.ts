import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class PagesController {
  @Get('success')
  success(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'success.html'));
  }

  @Get('fail')
  fail(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'fail.html'));
  }
}
