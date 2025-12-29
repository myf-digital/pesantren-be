'use strict';

import moment from 'moment';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { Op } from 'sequelize';
import { Request, Response } from 'express';
import { helper } from '../../helpers/helper';
import { response } from '../../helpers/response';
import { appConfig } from '../../config/config.app';
import { sequelize } from '../../database/connection';
import { repository as RepoMenu } from '../app/menu/menu.repository';
import { repository as RoleMenu } from '../app/role.menu/role.menu.repository';
import { NOT_FOUND, REQUIRED, SUCCESS_RETRIEVED } from '../../utils/constant';

const nestedChildren = (
  data: any,
  parent: string = '00000000-0000-0000-0000-000000000000'
) => {
  let result: Array<object> = [];
  data.forEach((item: any) => {
    const menu: any = item?.dataValues;
    if (menu?.parent_id === parent) {
      let children: any = nestedChildren(data, menu?.menu_id);
      result.push({
        ...menu,
        children,
      });
    }
  });
  return result;
};

const formatNavigationRole = (data: any) => {
  let result: Array<object> = [];
  if (data?.dataValues?.role_menu?.length > 0) {
    result = data?.dataValues?.role_menu.map((rm: any) => rm?.menu);
  }
  const navigation = nestedChildren(result);
  return navigation;
};

const sortRecursive = (nodes: any[] = []) => {
  nodes.sort((a, b) => (a.seq_number ?? 0) - (b.seq_number ?? 0));
  nodes.forEach((n) => {
    if (Array.isArray(n.children)) {
      sortRecursive(n.children);
    }
  });
};

const generateHeaderExcel = (sheet: any, data: any) => {
  sheet.addRow([data?.title]);
  sheet.mergeCells(data?.start + '1', data?.end + '1');
  sheet.mergeCells(data?.start + '2', data?.end + '2');
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell: any) => {
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
  });
  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
  });
};

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'No Polis',
    'Perusahaan',
    'Produk',
    'Pemegang Polis',
    'Tertanggung',
    'Penerima Manfaat',
    'Issued Date',
    'Currency',
    'Premi',
    'Premi Dirupiahkan',
    'Masa Pembayaran',
    'Masa Pertanggungan',
    'Unit Link',
    'Fund',
    'Nilai Tunai',
    'Beli di',
    'Cuti Premi',
    'Benefit',
  ]);
  sheet.getCell('S4').value = 'UP Jiwa';
  sheet.getCell('T4').value = 'RS';
  sheet.getCell('U4').value = 'Penyakit Kritis';
  sheet.getCell('V4').value = 'Pensiun';
  sheet.getCell('W4').value = 'Jatuh Tempo';

  const rows: Array<string> = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
  ];
  rows.forEach((r: string) => {
    sheet.mergeCells(`${r}3`, `${r}4`);
  });
  sheet.mergeCells('S3', 'W3');

  for (let row = 1; row <= 4; row++) {
    sheet.getRow(row).eachCell((cell: any) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    if (row > 2) {
      sheet.getRow(row).eachCell((cell: any) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00FF00' }, // Green color
        };
      });
    }
  }

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.policy_number || '',
      details[i]?.provider_company || '',
      details[i]?.product_name || '',
      details[i]?.policy_holder_name || '',
      details[i]?.insured_holder_name || '',
      details[i]?.beneficiary_holder_name || '',
      details[i]?.issued_date || '',
      details[i]?.premi_currency || '',
      helper.formatIDR(details[i]?.premi_value),
      helper.formatIDR(details[i]?.total_premi),
      details[i]?.payment_term
        ? `${details[i]?.payment_term} ${details[i]?.payment_term_unit || 'tahun'}`
        : details[i]?.payment_term_unit,
      details[i]?.insured_term
        ? `${details[i]?.insured_term_unit} ${details[i]?.insured_term}`
        : details[i]?.insured_term_unit || '',
      details[i]?.unit_link == '1' ? 'Y' : 'N',
      details[i]?.fund || '',
      helper.formatIDR(details[i]?.cash_value),
      details[i]?.seller_name || '',
      ['Yes', 'Y'].includes(details[i]?.premi_off) ? 'Y' : 'N',
    ]);
  }

  for (let row = 3; row <= details?.length + 4; row++) {
    sheet.getRow(row).eachCell((cell: any) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });
  }

  return sheet;
};

const generateHtmlPDF = (title: string, details: any) => {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: center;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <h2 style="text-align: center;">${title}</h2>
        <table>
          <tr>
            <th>No</th>
            <th>Policy Number</th>
            <th>Provider Company</th>
            <th>Product Name</th>
            <th>Policy Holder</th>
            <th>Insured Holder</th>
            <th>Beneficiary Holder</th>
            <th>Issued Date</th>
            <th>Payment Term</th>
            <th>Premi Value</th>
            <th>Premi IDR</th>
          </tr>
  `;
  for (let i in details) {
    html += `
      <tr>
        <td>${parseInt(i) + 1}</td>
        <td>${details[i]?.policy_number || ''}</td>
        <td>${details[i]?.provider_company || ''}</td>
        <td>${details[i]?.product_name || ''}</td>
        <td>${details[i]?.policy_holder_name || ''}</td>
        <td>${details[i]?.insured_holder_name || ''}</td>
        <td>${details[i]?.beneficiary_holder_name || ''}</td>
        <td>${details[i]?.issued_date || ''}</td>
        <td>
          ${
            details[i]?.payment_term
              ? `${details[i]?.payment_term} ${details[i]?.payment_term_unit}`
              : details[i]?.payment_term_unit
          }
        </td>
        <td>${details[i]?.premi_currency} ${helper.formatIDR(details[i]?.premi_value)}</td>
        <td>IDR ${helper.formatIDR(details[i]?.total_premi)}</td>
      </tr>
    `;
  }
  html += `
        </table>
      </body>
    </html>
  `;
  return html;
};

export default class Controller {
  public index(req: Request, res: Response) {
    return response.success(
      `Hello from the ${appConfig?.app} RESTful API  !!!!!`,
      null,
      res
    );
  }

  public async navigation(req: Request, res: Response) {
    try {
      let navigation: any;

      const role_name: string = req?.user?.role_name;
      if (role_name && role_name != undefined) {
        const result = await RoleMenu.detailRole({
          role_name: { [Op.like]: `%${role_name}%` },
        });
        if (!result) return response.success(NOT_FOUND, null, res, false);
        navigation = formatNavigationRole(result);
      } else {
        const result = await RepoMenu.list();
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
        navigation = nestedChildren(result);
      }

      sortRecursive(navigation);
      return response.success(SUCCESS_RETRIEVED, navigation, res);
    } catch (err: any) {
      return helper.catchError(`navigation: ${err?.message}`, 500, res);
    }
  }

  public sendmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, subject, content } = req?.body;
      if (!email) return response.failed(`email ${REQUIRED}`, 422, res);
      if (!subject) return response.failed(`subject ${REQUIRED}`, 422, res);
      if (!content) return response.failed(`content ${REQUIRED}`, 422, res);

      let attachments: Array<Object> = [];
      if (req?.files && req?.files?.attachs) {
        const attachs = req?.files?.attachs;
        if (attachs?.length > 0) {
          for (let i in attachs) {
            attachments.push({
              filename: attachs[i]?.name,
              path: attachs[i]?.tempFilePath,
            });
          }
        } else {
          attachments.push({
            filename: attachs?.name,
            path: attachs?.tempFilePath,
          });
        }
      }

      await helper.sendEmail({
        to: email,
        subject: subject,
        content: content,
        attachments: attachments,
      });

      return response.success('Send email success', null, res);
    } catch (err: any) {
      return helper.catchError(`sendmail: ${err?.message}`, 500, res);
    }
  };

  public sendtele = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req?.body;
      if (!message) return response.failed(`message ${REQUIRED}`, 422, res);
      const tele = await helper.sendNotif(message || '-');
      return response.success(
        `Send telegram ${tele ? 'success' : 'failed'}`,
        tele,
        res,
        tele
      );
    } catch (err: any) {
      return helper.catchError(`sendtele: ${err?.message}`, 500, res);
    }
  };

  public async dashboardExcel(req: Request, res: Response) {
    try {
      const flag: any = req?.query?.flag;

      const result = [];
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      const policy: any = [];

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string =
        flag && flag != 'false' ? flag.replace(/,/g, '-') : 'dashboard';
      const filename: string = `${name}-${moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `DATA ${name.replace(/_/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('DATA DASHBOARD');

      generateHeaderExcel(sheet, {
        start: 'A',
        end: 'W',
        title: title,
      });
      generateDataExcel(sheet, policy);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel dashboard', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel dashboard: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async dashboardPDF(req: Request, res: Response) {
    try {
      const flag: any = req?.query?.flag;

      const result = [];
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      const policy: any = [];

      const { dir, path } = await helper.checkDirExport('pdf');

      const name: string =
        flag && flag != 'false' ? flag.replace(/,/g, '-') : 'dashboard';
      const filename: string = `${name}-${moment().format('DDMMYYYY')}.pdf`;
      const title: string = `DATA ${name.replace(/_/g, ' ').toUpperCase()}`;
      const urlPDF: string = `${dir}/${filename}`;

      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Avoids /dev/shm issues in Docker
          '--disable-accelerated-2d-canvas',
          '--disable-gpu', // Disable GPU hardware acceleration
          '--remote-debugging-port=9222',
        ],
      });
      const page = await browser.newPage();

      const htmlContent = generateHtmlPDF(title, policy);
      await page.setContent(htmlContent);
      await page.pdf({
        path: `${path}/${filename}`,
        format: 'A4',
        landscape: true,
      });
      await browser.close();

      return response.success('export pdf dashboard', urlPDF, res);
    } catch (err: any) {
      return helper.catchError(
        `export pdf dashboard: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async health(req: Request, res: Response) {
    const health: any = {
      status: 'success',
      uptime: process.uptime(),
      timestamp: Date.now(),
      database: 'unknown',
    };

    try {
      await sequelize.query('SELECT 1');
      health.database = 'connected';
    } catch (err: any) {
      health.status = 'failed';
      health.database = 'disconnected';
      health.error = err?.message;
    }

    return response.success(
      'health check',
      health,
      res,
      health.status == 'success'
    );
  }
}

export const global = new Controller();
