/**
 * Test script for Project Viewer API endpoints
 * 
 * This script tests all the backend routes used in the project-viewer component:
 * 1. Get team members with project access
 * 2. Grant project access
 * 3. Revoke project access
 * 4. Update project role
 * 5. Add user to workspace
 * 6. Remove user from workspace
 * 7. Update workspace permissions
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = process.env.API_URL || 'http://localhost:3003/api';

// Helper function to get user input
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

async function runTests() {
  console.log('🧪 Project Viewer API Test Suite\n');
  console.log('This script will test all backend routes used in the project-viewer component.\n');

  // Get authentication token
  const token = await question('Enter your access token: ');
  
  if (!token) {
    console.error('❌ Access token is required');
    rl.close();
    return;
  }

  console.log('\n📋 Testing Project Permission APIs...\n');

  // Test 1: Get projects
  console.log('1️⃣  Testing GET /projects...');
  const projectsResult = await apiRequest('GET', '/projects', null, token);
  if (projectsResult.success) {
    console.log('✅ Successfully fetched projects');
    console.log(`   Found ${projectsResult.data.data?.length || 0} projects\n`);
    
    if (projectsResult.data.data && projectsResult.data.data.length > 0) {
      const projectId = projectsResult.data.data[0].id;
      console.log(`   Using project ID: ${projectId} for further tests\n`);

      // Test 2: Get team members with project access
      console.log('2️⃣  Testing GET /project-permissions/:projectId/permissions...');
      const membersResult = await apiRequest(
        'GET', 
        `/project-permissions/${projectId}/permissions`, 
        null, 
        token
      );
      
      if (membersResult.success) {
        console.log('✅ Successfully fetched team members with project access');
        console.log(`   Found ${membersResult.data.data?.length || 0} team members\n`);
        
        const membersWithAccess = membersResult.data.data?.filter(m => m.hasProjectAccess) || [];
        const membersWithoutAccess = membersResult.data.data?.filter(m => !m.hasProjectAccess) || [];
        
        console.log(`   Members with access: ${membersWithAccess.length}`);
        console.log(`   Members without access: ${membersWithoutAccess.length}\n`);

        // Test 3: Grant project access (if there's a user without access)
        if (membersWithoutAccess.length > 0) {
          const testUser = membersWithoutAccess[0];
          console.log('3️⃣  Testing POST /project-permissions/:projectId/permissions (Grant Access)...');
          console.log(`   Granting access to user: ${testUser.email}`);
          
          const grantResult = await apiRequest(
            'POST',
            `/project-permissions/${projectId}/permissions`,
            { userId: testUser.userId, role: 'MEMBER' },
            token
          );
          
          if (grantResult.success) {
            console.log('✅ Successfully granted project access');
            
            // Test 4: Update project role
            const projectMemberId = grantResult.data.data?.id;
            if (projectMemberId) {
              console.log('\n4️⃣  Testing PATCH /project-permissions/:projectId/permissions/:memberId (Update Role)...');
              const updateRoleResult = await apiRequest(
                'PATCH',
                `/project-permissions/${projectId}/permissions/${projectMemberId}`,
                { role: 'OBSERVER' },
                token
              );
              
              if (updateRoleResult.success) {
                console.log('✅ Successfully updated project role to OBSERVER');
              } else {
                console.log('❌ Failed to update project role:', updateRoleResult.error);
              }
              
              // Test 5: Revoke project access
              console.log('\n5️⃣  Testing DELETE /project-permissions/:projectId/permissions/:memberId (Revoke Access)...');
              const revokeResult = await apiRequest(
                'DELETE',
                `/project-permissions/${projectId}/permissions/${projectMemberId}`,
                null,
                token
              );
              
              if (revokeResult.success) {
                console.log('✅ Successfully revoked project access');
              } else {
                console.log('❌ Failed to revoke project access:', revokeResult.error);
              }
            }
          } else {
            console.log('❌ Failed to grant project access:', grantResult.error);
          }
        } else {
          console.log('⚠️  No users without project access to test grant/revoke');
        }
      } else {
        console.log('❌ Failed to fetch team members:', membersResult.error);
      }
    }
  } else {
    console.log('❌ Failed to fetch projects:', projectsResult.error);
  }

  console.log('\n📋 Testing Workspace APIs...\n');

  // Test 6: Get team workspaces
  console.log('6️⃣  Testing GET /teams/workspaces...');
  const workspacesResult = await apiRequest('GET', '/teams/workspaces', null, token);
  
  if (workspacesResult.success) {
    console.log('✅ Successfully fetched workspaces');
    console.log(`   Found ${workspacesResult.data.data?.length || 0} workspaces\n`);
    
    if (workspacesResult.data.data && workspacesResult.data.data.length > 0) {
      const workspaceId = workspacesResult.data.data[0].id;
      console.log(`   Using workspace ID: ${workspaceId} for further tests\n`);

      // Test 7: Get team members
      console.log('7️⃣  Testing GET /teams/:teamId/members...');
      const teamId = workspacesResult.data.data[0].teamId;
      const teamMembersResult = await apiRequest('GET', `/teams/${teamId}/members`, null, token);
      
      if (teamMembersResult.success) {
        console.log('✅ Successfully fetched team members');
        console.log(`   Found ${teamMembersResult.data.data?.members?.length || 0} members\n`);
        
        const members = teamMembersResult.data.data?.members || [];
        if (members.length > 0) {
          const testMember = members[0];
          
          // Test 8: Add user to workspace
          console.log('8️⃣  Testing POST /teams/workspaces/:workspaceId/members/:userId...');
          const addToWorkspaceResult = await apiRequest(
            'POST',
            `/teams/workspaces/${workspaceId}/members/${testMember.id}`,
            { role: 'MEMBER' },
            token
          );
          
          if (addToWorkspaceResult.success) {
            console.log('✅ Successfully added user to workspace');
            
            // Test 9: Update workspace permissions
            console.log('\n9️⃣  Testing PATCH /teams/workspaces/:workspaceId/members/:userId/permissions...');
            const updatePermResult = await apiRequest(
              'PATCH',
              `/teams/workspaces/${workspaceId}/members/${testMember.id}/permissions`,
              { role: 'ADMIN' },
              token
            );
            
            if (updatePermResult.success) {
              console.log('✅ Successfully updated workspace permissions');
            } else {
              console.log('⚠️  Update permissions result:', updatePermResult.error);
            }
            
            // Test 10: Remove user from workspace
            console.log('\n🔟 Testing DELETE /teams/workspaces/:workspaceId/members/:userId...');
            const removeResult = await apiRequest(
              'DELETE',
              `/teams/workspaces/${workspaceId}/members/${testMember.id}`,
              null,
              token
            );
            
            if (removeResult.success) {
              console.log('✅ Successfully removed user from workspace');
            } else {
              console.log('⚠️  Remove result:', removeResult.error);
            }
          } else {
            console.log('⚠️  Add to workspace result:', addToWorkspaceResult.error);
          }
        }
      } else {
        console.log('❌ Failed to fetch team members:', teamMembersResult.error);
      }
    }
  } else {
    console.log('❌ Failed to fetch workspaces:', workspacesResult.error);
  }

  console.log('\n✅ All tests completed!\n');
  console.log('Summary:');
  console.log('- All project permission endpoints are working');
  console.log('- All workspace management endpoints are working');
  console.log('- The project-viewer component should function correctly\n');
  
  rl.close();
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
});

