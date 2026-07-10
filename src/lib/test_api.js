const http = require('http');

const API_URL = 'http://localhost:5003/api';

function post(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, error: parsed.error || responseBody });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject({ status: res.statusCode, error: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Starting Roles & Permissions CRUD API Verification Test...');

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testRoleName = `Audit Officer ${uniqueSuffix}`;
  const testRoleEditedName = `Auditor Officer ${uniqueSuffix}`;
  const testPermName = `audit:verify_${uniqueSuffix}`;
  const testPermEditedName = `audit:verify_scoped_${uniqueSuffix}`;

  try {
    // 1. Login as Super Admin
    console.log('\n--- 1. Logging in as Super Admin ---');
    const loginRes = await post(`${API_URL}/auth/login`, {
      loginIdentifier: 'admin@assetiq.com',
      password: 'admin123'
    });
    const token = loginRes.token;
    console.log('Login successful!');

    // 2. Add a new role
    console.log(`\n--- 2. Creating New Role: "${testRoleName}" ---`);
    const roleAddRes = await post(`${API_URL}/roles/add`, {
      name: testRoleName,
      description: 'Audit security logs'
    }, token);
    console.log('Created Role:', roleAddRes.role);
    const roleId = roleAddRes.role.id;

    // 3. Edit the role
    console.log(`\n--- 3. Editing Created Role to: "${testRoleEditedName}" ---`);
    const roleEditRes = await post(`${API_URL}/roles/edit`, {
      id: roleId,
      name: testRoleEditedName,
      description: 'Audit compliance logs'
    }, token);
    console.log('Edited Role:', roleEditRes.role);

    // 4. Add a new permission
    console.log(`\n--- 4. Creating New Permission: "${testPermName}" ---`);
    const permAddRes = await post(`${API_URL}/permissions/add`, {
      name: testPermName,
      description: 'Verify audit trails'
    }, token);
    console.log('Created Permission:', permAddRes.permission);
    const permId = permAddRes.permission.id;

    // 5. Edit the permission
    console.log(`\n--- 5. Editing Created Permission to: "${testPermEditedName}" ---`);
    const permEditRes = await post(`${API_URL}/permissions/edit`, {
      id: permId,
      name: testPermEditedName,
      description: 'Verify scoped audit trails'
    }, token);
    console.log('Edited Permission:', permEditRes.permission);

    // 6. Assign the permission to the role
    console.log('\n--- 6. Mapping Permission to Role ---');
    const assignRes = await post(`${API_URL}/roles/update-permissions`, {
      roleId: roleId,
      permissionIds: [permId]
    }, token);
    console.log('Assign mapping response:', assignRes.message);

    // Verify mapping
    const rolesRes = await post(`${API_URL}/roles/list`, {}, token);
    const verifyRole = rolesRes.roles.find(r => r.id === roleId);
    console.log('Verified Role Permissions mapping in list:', verifyRole.permissions.map(p => p.name));

    // 7. Delete the permission
    console.log('\n--- 7. Deleting Permission ---');
    const permDelRes = await post(`${API_URL}/permissions/delete`, { id: permId }, token);
    console.log('Deleted Permission response:', permDelRes.message);

    // 8. Delete the role
    console.log('\n--- 8. Deleting Role ---');
    const roleDelRes = await post(`${API_URL}/roles/delete`, { id: roleId }, token);
    console.log('Deleted Role response:', roleDelRes.message);

    console.log('\nVerification Test passed successfully!');
  } catch (err) {
    console.error('\nVerification Test failed:', err);
  }
}

run();
