export enum AccountRoles {
  nobody = -1, // 인증되지 않은 사람
  guest = 100, // 인증은 됐지만 그룹에는 초대되지 않은 사람
  member = 300, // 그룹에 초대된 사람(M명)
  editor = 500, // 그룹에 초대된뒤 에디터로 승격된 사람(N명)
  owner = 700, // 그룹을 만든 사람(1명)
  admin = 900,
}

export interface AuthPayload {
  sub: string;
  uid: string;
  displayName: string;
  acl: ACL;
}

export interface ACL {
  admin: AccountRoles;

  [group: string]: AccountRoles;
}
