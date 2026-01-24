import { Controller, Get, Header } from '@nestjs/common';
import { PublicApi } from '../auth/decorators/role.decorator';

@Controller('.well-known')
export class WellKnownController {
  @Get('assetlinks.json')
  @PublicApi()
  @Header('Content-Type', 'application/json')
  getAssetLinks() {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.dangam.app',
          sha256_cert_fingerprints: [
            // Debug key
            'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
            // TODO: Production key 추가 필요
          ],
        },
      },
    ];
  }

  @Get('apple-app-site-association')
  @PublicApi()
  @Header('Content-Type', 'application/json')
  getAppleAppSiteAssociation() {
    return {
      applinks: {
        apps: [],
        details: [
          {
            appID: 'TEAM_ID.com.dangam.app', // TODO: Apple Team ID로 교체 필요
            paths: ['/invite/*'],
          },
        ],
      },
    };
  }
}
