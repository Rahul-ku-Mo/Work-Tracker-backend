const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const realisticCards = [
  {
    title: 'Implement User Authentication System',
    description: 'Design and develop a comprehensive user authentication system with OAuth 2.0 integration, multi-factor authentication support, and secure session management. This includes creating login/register pages, password reset functionality, email verification, and integration with third-party providers like Google and GitHub. The system should also include proper error handling, rate limiting, and security best practices to prevent common attacks like brute force and session hijacking.',
    priority: 'urgent',
    labels: ['Backend', 'Security', 'Authentication'],
    dueDate: new Date('2024-02-01T17:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'alex.chen@company.com'
  },
  {
    title: 'Design Dashboard Analytics UI',
    description: 'Create a modern, responsive dashboard interface that displays key performance metrics and analytics data. The design should include interactive charts, real-time data visualization, customizable widgets, and drill-down capabilities. Focus on user experience with intuitive navigation, accessible color schemes, and mobile-first responsive design. Include dark mode support, export functionality for reports, and integration with our existing design system components.',
    priority: 'high',
    labels: ['Frontend', 'Design', 'Analytics'],
    dueDate: new Date('2024-01-30T15:00:00Z'),
    columnIndex: 1, // In Progress
    assigneeEmail: 'sarah.johnson@company.com'
  },
  {
    title: 'Optimize Database Performance',
    description: 'Conduct comprehensive database performance optimization including query analysis, index optimization, and database schema improvements. Identify slow-running queries, implement proper indexing strategies, and optimize data retrieval patterns. This task involves setting up monitoring tools, analyzing query execution plans, implementing database connection pooling, and establishing performance benchmarks. Expected outcome is 40% improvement in query response times and reduced server load.',
    priority: 'high',
    labels: ['Backend', 'Database', 'Performance'],
    dueDate: new Date('2024-01-28T12:00:00Z'),
    columnIndex: 1, // In Progress
    assigneeEmail: 'michael.rodriguez@company.com'
  },
  {
    title: 'Mobile App Responsive Design',
    description: 'Develop responsive design components for the mobile application ensuring seamless user experience across different screen sizes and devices. This includes implementing touch-friendly interfaces, optimizing loading times, creating adaptive layouts, and ensuring accessibility compliance. The design should maintain brand consistency while adapting to various mobile platforms including iOS and Android with proper gesture support and native-like interactions.',
    priority: 'medium',
    labels: ['Frontend', 'Mobile', 'UX'],
    dueDate: new Date('2024-02-15T18:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'emma.davis@company.com'
  },
  {
    title: 'API Rate Limiting Implementation',
    description: 'Implement robust API rate limiting to prevent abuse and ensure fair usage across all client applications. This includes designing flexible rate limiting algorithms, implementing token bucket and sliding window approaches, creating rate limit headers for API responses, and building administrative tools for monitoring and adjusting limits. The solution should handle burst traffic gracefully while maintaining system stability and providing clear feedback to API consumers.',
    priority: 'high',
    labels: ['Backend', 'API', 'Security'],
    dueDate: new Date('2024-01-25T16:30:00Z'),
    columnIndex: 2, // Review
    assigneeEmail: 'david.wilson@company.com'
  },
  {
    title: 'User Onboarding Flow Enhancement',
    description: 'Redesign the user onboarding experience to improve user retention and reduce time-to-value for new users. This involves creating interactive tutorials, progress indicators, contextual help systems, and personalized setup workflows. Include A/B testing framework to measure onboarding effectiveness, implement user analytics tracking, and create adaptive flows based on user roles and use cases. The goal is to achieve 80% onboarding completion rate.',
    priority: 'medium',
    labels: ['UX', 'Frontend', 'Analytics'],
    dueDate: new Date('2024-02-10T14:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'emma.davis@company.com'
  },
  {
    title: 'Critical Security Vulnerability Fix',
    description: 'Address critical security vulnerability in the authentication module that could potentially allow unauthorized access to user accounts. This high-priority issue requires immediate attention including patch development, security testing, deployment coordination, and user communication. The fix involves updating encryption algorithms, strengthening session validation, and implementing additional security headers. All changes must be thoroughly tested and deployed with zero downtime.',
    priority: 'urgent',
    labels: ['Security', 'Critical', 'Hotfix'],
    dueDate: new Date('2024-01-22T09:00:00Z'),
    columnIndex: 1, // In Progress
    assigneeEmail: 'alex.chen@company.com'
  },
  {
    title: 'Real-time Notifications System',
    description: 'Build a comprehensive real-time notification system using WebSocket technology to deliver instant updates to users across web and mobile platforms. The system should support multiple notification types, user preferences management, notification history, and delivery guarantees. Include features like push notifications, email fallbacks, notification batching, and user status awareness. Ensure scalability to handle thousands of concurrent connections efficiently.',
    priority: 'medium',
    labels: ['Backend', 'Real-time', 'WebSocket'],
    dueDate: new Date('2024-02-05T17:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'sarah.johnson@company.com'
  },
  {
    title: 'Automated Testing Suite Setup',
    description: 'Establish comprehensive automated testing infrastructure including unit tests, integration tests, and end-to-end testing pipelines. This involves setting up testing frameworks, creating test data management systems, implementing continuous integration workflows, and establishing code coverage requirements. The suite should include visual regression testing, API testing, performance testing, and automated deployment verification to ensure code quality and reliability.',
    priority: 'high',
    labels: ['Testing', 'CI/CD', 'QA'],
    dueDate: new Date('2024-01-27T13:00:00Z'),
    columnIndex: 2, // Review
    assigneeEmail: 'michael.rodriguez@company.com'
  },
  {
    title: 'Data Export Functionality',
    description: 'Implement comprehensive data export capabilities allowing users to export their data in multiple formats including CSV, Excel, JSON, and PDF. The feature should support filtered exports, scheduled exports, large dataset handling with streaming, and customizable export templates. Include proper data sanitization, user permission checking, export history tracking, and progress indicators for long-running exports. Ensure GDPR compliance for data exports.',
    priority: 'low',
    labels: ['Feature', 'Backend', 'Data'],
    dueDate: new Date('2024-02-20T12:00:00Z'),
    columnIndex: 3, // Done
    assigneeEmail: 'emma.davis@company.com'
  },
  {
    title: 'Search Engine Optimization',
    description: 'Optimize the application for search engines to improve organic discovery and user acquisition. This includes implementing proper meta tags, structured data markup, sitemap generation, page speed optimization, and content optimization strategies. Focus on technical SEO aspects like server-side rendering, lazy loading, image optimization, and mobile-first indexing. Create comprehensive SEO monitoring and reporting dashboards to track performance improvements.',
    priority: 'low',
    labels: ['SEO', 'Frontend', 'Performance'],
    dueDate: new Date('2024-03-01T15:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'david.wilson@company.com'
  },
  {
    title: 'Payment Gateway Integration',
        description: 'Integrate multiple payment gateways including Paddle, PayPal, and Apple Pay to provide flexible payment options for users. Implementation should include secure payment processing, webhook handling, subscription management, refund processing, and comprehensive error handling. Ensure PCI compliance, implement fraud detection, create payment analytics dashboards, and support multiple currencies. Include thorough testing with sandbox environments.',
    priority: 'urgent',
    labels: ['Backend', 'Payment', 'Integration'],
    dueDate: new Date('2024-01-26T17:00:00Z'),
    columnIndex: 1, // In Progress
    assigneeEmail: 'alex.chen@company.com'
  },
  {
    title: 'API Documentation Portal',
    description: 'Create an interactive API documentation portal using modern documentation tools like Swagger/OpenAPI. The portal should include code examples, interactive testing capabilities, authentication guides, rate limiting information, and SDK downloads. Implement automated documentation generation from code comments, version management, community feedback systems, and comprehensive getting-started guides for developers to easily integrate with our APIs.',
    priority: 'medium',
    labels: ['Documentation', 'API', 'Developer'],
    dueDate: new Date('2024-02-12T16:00:00Z'),
    columnIndex: 3, // Done
    assigneeEmail: 'alex.chen@company.com'
  },
  {
    title: 'Microservices Architecture Migration',
    description: 'Plan and execute migration from monolithic architecture to microservices to improve scalability, maintainability, and deployment flexibility. This involves service decomposition analysis, API design, data migration strategies, inter-service communication patterns, and deployment orchestration. Include comprehensive monitoring, logging, and error handling across services. Ensure zero-downtime migration with proper rollback strategies and gradual traffic shifting.',
    priority: 'high',
    labels: ['Architecture', 'Backend', 'DevOps'],
    dueDate: new Date('2024-03-15T12:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'sarah.johnson@company.com'
  },
  {
    title: 'Advanced Analytics Dashboard',
    description: 'Develop sophisticated analytics dashboard with machine learning insights, predictive analytics, and customizable reporting capabilities. The dashboard should provide real-time data visualization, trend analysis, user behavior insights, and business intelligence features. Include drag-and-drop dashboard builder, automated report generation, data filtering and segmentation, export capabilities, and integration with external analytics tools for comprehensive business intelligence.',
    priority: 'medium',
    labels: ['Analytics', 'ML', 'Dashboard'],
    dueDate: new Date('2024-02-28T14:30:00Z'),
    columnIndex: 2, // Review
    assigneeEmail: 'michael.rodriguez@company.com'
  },
  {
    title: 'Customer Support Chat Integration',
    description: 'Implement comprehensive customer support chat system with AI-powered chatbot capabilities, human agent escalation, and multi-channel support including web, mobile, and email integration. Features should include conversation history, file sharing, screen sharing, real-time typing indicators, customer satisfaction surveys, and integration with existing CRM systems. Ensure 24/7 availability with intelligent routing and priority queuing.',
    priority: 'high',
    labels: ['Support', 'AI', 'Chat'],
    dueDate: new Date('2024-02-18T16:00:00Z'),
    columnIndex: 0, // Backlog
    assigneeEmail: 'emma.davis@company.com'
  },
  {
    title: 'Internationalization Implementation',
    description: 'Implement comprehensive internationalization (i18n) support for multiple languages and regions including text translation, date/time formatting, currency handling, and right-to-left language support. This involves creating translation management workflows, implementing dynamic language switching, handling plural forms and gender-specific translations, and ensuring proper text expansion for different languages. Include automated translation tools and community translation platforms.',
    priority: 'low',
    labels: ['i18n', 'Frontend', 'Global'],
    dueDate: new Date('2024-03-10T11:00:00Z'),
    columnIndex: 3, // Done
    assigneeEmail: 'david.wilson@company.com'
  },
  {
    title: 'Content Management System',
    description: 'Build flexible content management system with WYSIWYG editor, media management, version control, and workflow approval processes. The system should support multiple content types, SEO optimization, scheduled publishing, content templates, and collaborative editing. Include advanced features like content staging, A/B testing for content, analytics integration, and multi-site management capabilities for scalable content operations.',
    priority: 'medium',
    labels: ['CMS', 'Content', 'Editor'],
    dueDate: new Date('2024-02-25T13:30:00Z'),
    columnIndex: 1, // In Progress
    assigneeEmail: 'david.wilson@company.com'
  },
  {
    title: 'Infrastructure Monitoring Setup',
    description: 'Establish comprehensive infrastructure monitoring and alerting system using modern observability tools. This includes server monitoring, application performance monitoring, log aggregation, distributed tracing, and automated alerting workflows. Implement dashboards for different stakeholder groups, SLA monitoring, capacity planning tools, and incident response automation. Ensure proactive issue detection and resolution with minimal manual intervention.',
    priority: 'high',
    labels: ['DevOps', 'Monitoring', 'Infrastructure'],
    dueDate: new Date('2024-01-29T10:00:00Z'),
    columnIndex: 2, // Review
    assigneeEmail: 'alex.chen@company.com'
  },
  {
    title: 'Social Media Integration',
    description: 'Develop social media integration features allowing users to connect their social accounts, share content, and import data from various social platforms. This includes OAuth integration with major social networks, content scheduling tools, social analytics tracking, and automated posting capabilities. Ensure compliance with platform APIs, implement proper rate limiting, and create engaging social sharing experiences with rich media support.',
    priority: 'low',
    labels: ['Social', 'Integration', 'API'],
    dueDate: new Date('2024-03-05T15:45:00Z'),
    columnIndex: 3, // Done
    assigneeEmail: 'sarah.johnson@company.com'
  }
];

const teamMembers = [
  {
    name: 'Alex Chen',
    email: 'alex.chen@company.com',
    username: 'alex_chen',
    company: 'TechCorp',
    department: 'Backend Engineering'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    username: 'sarah_johnson',
    company: 'TechCorp',
    department: 'Frontend Engineering'
  },
  {
    name: 'Michael Rodriguez',
    email: 'michael.rodriguez@company.com',
    username: 'michael_rodriguez',
    company: 'TechCorp',
    department: 'DevOps Engineering'
  },
  {
    name: 'Emma Davis',
    email: 'emma.davis@company.com',
    username: 'emma_davis',
    company: 'TechCorp',
    department: 'UI/UX Design'
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@company.com',
    username: 'david_wilson',
    company: 'TechCorp',
    department: 'Full Stack Engineering'
  }
];

async function seedRealisticData() {
  try {
    console.log('🌱 Starting realistic data seeding...');

    // Create demo users
    console.log('👥 Creating team members...');
    const createdUsers = {};
    
    for (const member of teamMembers) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = await prisma.user.upsert({
        where: { email: member.email },
        update: {},
        create: {
          email: member.email,
          password: hashedPassword,
          name: member.name,
          username: member.username,
          company: member.company,
          department: member.department,
          isPaidUser: true,
          isActive: true,
          role: 'USER'
        }
      });
      
      createdUsers[member.email] = user;
      console.log(`   ✓ Created user: ${member.name} (${member.email})`);
    }

    // Create a demo team
    console.log('👥 Creating demo team...');
    const teamCaptain = createdUsers['alex.chen@company.com'];
    
    const team = await prisma.team.upsert({
      where: { id: 'demo-team-id' },
      update: {},
      create: {
        id: 'demo-team-id',
        name: 'TechCorp Development Team',
        joinCode: 'DEMO2024',
        captainId: teamCaptain.id,
        members: {
          connect: Object.values(createdUsers).map(user => ({ id: user.id }))
        }
      }
    });

    // Update all users to be part of the team
    for (const user of Object.values(createdUsers)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { teamId: team.id }
      });
    }

    console.log(`   ✓ Created team: "${team.name}" with join code: ${team.joinCode}`);

    // Find or create a demo board
    console.log('📋 Creating demo board...');
    const boardOwner = createdUsers['alex.chen@company.com'];
    
    const board = await prisma.board.upsert({
      where: { id: 1 },
      update: {},
      create: {
        title: 'Product Development Sprint',
        userId: boardOwner.id,
        colorId: 'emerald',
        colorValue: '#10b981',
        colorName: 'Emerald'
      }
    });

    // Add all users as board members
    console.log('👨‍💼 Adding board members...');
    for (const user of Object.values(createdUsers)) {
      await prisma.boardUser.upsert({
        where: { 
          boardId_userId: {
            boardId: board.id,
            userId: user.id
          }
        },
        update: {},
        create: {
          boardId: board.id,
          userId: user.id,
          role: user.id === boardOwner.id ? 'ADMIN' : 'MEMBER'
        }
      });
    }

    // Create columns
    console.log('📂 Creating columns...');
    const columnTitles = ['Backlog', 'In Progress', 'Review', 'Done'];
    const columns = [];
    
    for (let i = 0; i < columnTitles.length; i++) {
      const column = await prisma.column.upsert({
        where: { id: i + 1 },
        update: {},
        create: {
          title: columnTitles[i],
          order: i + 1,
          boardId: board.id
        }
      });
      columns.push(column);
      console.log(`   ✓ Created column: ${columnTitles[i]}`);
    }

    // Create realistic cards
    console.log('🎯 Creating realistic project cards...');
    let cardOrder = 1000;
    
    for (const cardData of realisticCards) {
      const assignee = createdUsers[cardData.assigneeEmail];
      const targetColumn = columns[cardData.columnIndex];
      
      // Create the card
      const card = await prisma.card.create({
        data: {
          title: cardData.title,
          description: cardData.description,
          order: cardOrder,
          columnId: targetColumn.id,
          labels: cardData.labels,
          priority: cardData.priority,
          dueDate: cardData.dueDate,
          creatorId: boardOwner.id,
          // Note: assignees is a many-to-many relation, we'll connect it separately
        }
      });

      // Connect the assignee
      if (assignee) {
        await prisma.card.update({
          where: { id: card.id },
          data: {
            assignees: {
              connect: { id: assignee.id }
            }
          }
        });
      }

      console.log(`   ✓ Created card: "${cardData.title}" assigned to ${cardData.assigneeEmail}`);
      cardOrder += 1000;
    }

    console.log('🎉 Realistic data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Created ${teamMembers.length} team members`);
    console.log(`   • Created 1 demo team: "${team.name}"`);
    console.log(`   • Created 1 demo board: "${board.title}"`);
    console.log(`   • Created ${columnTitles.length} columns`);
    console.log(`   • Created ${realisticCards.length} realistic project cards`);
    console.log('\n🔐 Login credentials for testing:');
    console.log('   Email: alex.chen@company.com');
    console.log('   Password: password123');
    console.log('\n📱 All users have the same password: password123');
    console.log(`\n🎯 Team Join Code: ${team.joinCode}`);

  } catch (error) {
    console.error('❌ Error seeding realistic data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedRealisticData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 