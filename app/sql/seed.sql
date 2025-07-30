-- Seed categories
INSERT INTO categories (name, description, created_at, updated_at)
VALUES 
  ('SaaS', 'Software as a Service products', NOW(), NOW()),
  ('AI/ML', 'Artificial Intelligence and Machine Learning', NOW(), NOW()),
  ('Developer Tools', 'Tools for developers', NOW(), NOW()),
  ('Design Tools', 'Tools for designers', NOW(), NOW()),
  ('Marketing Tools', 'Tools for marketers', NOW(), NOW());

-- Seed products
INSERT INTO products (name, tagline, description, how_it_works, icon, url, stats, profile_id, category_id, created_at, updated_at)
VALUES
  ('DevTool Pro', 'The ultimate developer toolkit', 'Comprehensive development suite', 'Easy integration with existing workflow', '/icons/devtool.png', 'https://devtool.pro', '{"views": 0, "reviews": 0}', '3c378505-f00a-454e-aaf8-ba3ec182913a', 1, NOW(), NOW()),
  ('DesignMaster', 'Design like a pro', 'Professional design platform', 'Intuitive interface for designers', '/icons/design.png', 'https://designmaster.app', '{"views": 0, "reviews": 0}', '3c378505-f00a-454e-aaf8-ba3ec182913a', 2, NOW(), NOW()),
  ('MarketGenius', 'Smart marketing automation', 'AI-powered marketing platform', 'Automated marketing workflows', '/icons/market.png', 'https://marketgenius.io', '{"views": 0, "reviews": 0}', '3c378505-f00a-454e-aaf8-ba3ec182913a', 3, NOW(), NOW()),
  ('CodeBuddy', 'Your coding companion', 'AI pair programming assistant', 'Real-time code suggestions', '/icons/code.png', 'https://codebuddy.dev', '{"views": 0, "reviews": 0}', '3c378505-f00a-454e-aaf8-ba3ec182913a', 4, NOW(), NOW()),
  ('DataViz', 'Beautiful data visualization', 'Turn data into insights', 'Drag-and-drop visualization builder', '/icons/dataviz.png', 'https://dataviz.app', '{"views": 0, "reviews": 0}', '3c378505-f00a-454e-aaf8-ba3ec182913a', 5, NOW(), NOW());

-- Seed product upvotes (bridge table)
INSERT INTO product_upvotes (product_id, profile_id)
VALUES (1, '3c378505-f00a-454e-aaf8-ba3ec182913a');

-- Seed reviews
INSERT INTO reviews (product_id, profile_id, rating, review, created_at, updated_at)
VALUES
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 5, 'Excellent developer tool!', NOW(), NOW()),
  (2, '3c378505-f00a-454e-aaf8-ba3ec182913a', 4, 'Great design features', NOW(), NOW()),
  (3, '3c378505-f00a-454e-aaf8-ba3ec182913a', 5, 'Amazing marketing automation', NOW(), NOW()),
  (4, '3c378505-f00a-454e-aaf8-ba3ec182913a', 4, 'Very helpful coding assistant', NOW(), NOW()),
  (5, '3c378505-f00a-454e-aaf8-ba3ec182913a', 5, 'Powerful visualization tool', NOW(), NOW());

-- Seed topics
INSERT INTO topics (name, slug, created_at)
VALUES
  ('Development', 'development', NOW()),
  ('Design', 'design', NOW()),
  ('Marketing', 'marketing', NOW()),
  ('Startups', 'startups', NOW()),
  ('AI', 'ai', NOW());

-- Seed posts
INSERT INTO posts (title, content, topic_id, profile_id, created_at, updated_at)
VALUES
  ('Getting Started with DevTool Pro', 'A comprehensive guide to DevTool Pro...', 1, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW(), NOW()),
  ('Design Tips and Tricks', 'Essential design principles...', 2, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW(), NOW()),
  ('Marketing Automation Best Practices', 'How to automate your marketing...', 3, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW(), NOW()),
  ('Launching Your First Product', 'Steps to a successful product launch...', 4, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW(), NOW()),
  ('AI in Modern Development', 'How AI is changing development...', 5, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW(), NOW());

-- Seed post upvotes (bridge table)
INSERT INTO post_upvotes (post_id, profile_id)
VALUES (1, '3c378505-f00a-454e-aaf8-ba3ec182913a');

-- Seed post replies
INSERT INTO post_replies (post_id, profile_id, reply, created_at, updated_at)
VALUES
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'Great post about DevTool Pro!', NOW(), NOW()),
  (2, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'These design tips are very helpful', NOW(), NOW()),
  (3, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'Marketing automation is crucial', NOW(), NOW()),
  (4, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'Launch strategy is on point', NOW(), NOW()),
  (5, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'AI is indeed transforming development', NOW(), NOW());

-- Seed gpt ideas
INSERT INTO gpt_ideas (idea, views, claimed_by, created_at)
VALUES
  ('AI-powered code review assistant', 0, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW()),
  ('Design system generator', 0, NULL, NOW()),
  ('Marketing campaign optimizer', 0, NULL, NOW()),
  ('Developer productivity tracker', 0, NULL, NOW()),
  ('Automated documentation tool', 0, NULL, NOW());

-- Seed gpt ideas likes (bridge table)
INSERT INTO gpt_ideas_likes (gpt_idea_id, profile_id)
VALUES (1, '3c378505-f00a-454e-aaf8-ba3ec182913a');

-- Seed team
INSERT INTO team (product_name, team_size, equity_split, product_stage, roles, product_description, created_at, updated_at)
VALUES
  ('DevTool Pro', 3, 30, 'mvp', 'Developer, Designer, Marketing', 'Developer productivity suite', NOW(), NOW()),
  ('DesignMaster', 2, 50, 'prototype', 'Designer, Developer', 'Design automation platform', NOW(), NOW()),
  ('MarketGenius', 4, 25, 'product', 'Marketing, Sales, Developer, Designer', 'Marketing analytics platform', NOW(), NOW()),
  ('CodeBuddy', 2, 50, 'idea', 'Developer, Product Manager', 'AI coding assistant', NOW(), NOW()),
  ('DataViz', 3, 33, 'mvp', 'Data Scientist, Developer, Designer', 'Data visualization tool', NOW(), NOW());

-- Seed message rooms
INSERT INTO message_rooms (created_at)
VALUES (NOW());

-- Seed message room members (bridge table)
INSERT INTO message_room_members (message_room_id, profile_id, created_at)
VALUES (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', NOW());

-- Seed messages
INSERT INTO messages (message_room_id, sender_id, content, created_at)
VALUES
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'Hello! Interested in collaboration', NOW()),
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'Let''s discuss the project details', NOW()),
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'What''s your availability?', NOW()),
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'I can start next week', NOW()),
  (1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'Great, looking forward to working together', NOW());

-- Seed notifications
INSERT INTO notifications (source_id, product_id, post_id, target_id, type, created_at)
VALUES
  ('3c378505-f00a-454e-aaf8-ba3ec182913a', 1, NULL, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'review', NOW()),
  ('3c378505-f00a-454e-aaf8-ba3ec182913a', NULL, 1, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'reply', NOW()),
  ('3c378505-f00a-454e-aaf8-ba3ec182913a', NULL, NULL, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'follow', NOW()),
  ('3c378505-f00a-454e-aaf8-ba3ec182913a', NULL, 2, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'mention', NOW()),
  ('3c378505-f00a-454e-aaf8-ba3ec182913a', 2, NULL, '3c378505-f00a-454e-aaf8-ba3ec182913a', 'review', NOW());




  -- Seed jobs
INSERT INTO jobs (
    position,
    overview,
    responsibilities,
    qualifications,
    benefits,
    skills,
    company_name,
    company_logo,
    company_location,
    apply_url,
    job_type,
    location,
    salary_range,
    created_at,
    updated_at
)
VALUES
    (
        'Senior Frontend Developer',
        'Join our team to build modern web applications using React and TypeScript',
        'Lead frontend development, mentor junior developers, architect solutions',
        'Min 5 years experience with React, Strong TypeScript skills',
        'Health insurance, 401k, Remote work, Learning budget',
        'React, TypeScript, Next.js, TailwindCSS',
        'TechCorp Inc',
        '/logos/techcorp.png',
        'San Francisco, CA',
        'https://techcorp.com/careers/senior-frontend',
        'full-time',
        'freelance',
        '$150,000 - $250,000',
        NOW(),
        NOW()
    ),
    (
        'UI/UX Designer',
        'Create beautiful and intuitive user interfaces for our products',
        'Design user flows, create wireframes, conduct user research',
        '3+ years of product design experience, Figma expertise',
        'Flexible hours, Health coverage, Stock options',
        'Figma, User Research, Prototyping, Design Systems',
        'DesignLabs',
        '/logos/designlabs.png',
        'New York, NY',
        'https://designlabs.com/jobs/uiux-designer',
        'full-time',
        'hybrid',
        '$100,000 - $120,000',
        NOW(),
        NOW()
    ),
    (
        'DevOps Engineer',
        'Help us scale our cloud infrastructure and improve deployment processes',
        'Manage AWS infrastructure, implement CI/CD pipelines, monitor systems',
        'Strong AWS experience, Kubernetes expertise, Infrastructure as Code',
        'Remote work, Competitive salary, Learning opportunities',
        'AWS, Kubernetes, Terraform, CI/CD',
        'CloudScale',
        '/logos/cloudscale.png',
        'Austin, TX',
        'https://cloudscale.io/careers/devops',
        'full-time',
        'freelance',
        '$120,000 - $150,000',
        NOW(),
        NOW()
    ),
    (
        'Marketing Intern',
        'Learn and contribute to our digital marketing initiatives',
        'Assist with social media, content creation, and campaign analysis',
        'Marketing student or recent graduate, Social media savvy',
        'Paid internship, Mentorship, Flexible schedule',
        'Social Media, Content Creation, Analytics',
        'GrowthHub',
        '/logos/growthhub.png',
        'Chicago, IL',
        'https://growthhub.com/internships/marketing',
        'part-time',
        'in-person',
        '$0 - $50,000',
        NOW(),
        NOW()
    ),
    (
        'Freelance Content Writer',
        'Create engaging technical content for our developer blog',
        'Write technical tutorials, documentation, and blog posts',
        'Strong writing skills, Technical background, SEO knowledge',
        'Flexible hours, Competitive per-article rates',
        'Technical Writing, SEO, Developer Documentation',
        'DevMedia',
        '/logos/devmedia.png',
        'Remote',
        'https://devmedia.com/writers',
        'remote',
        'freelance',
        '$50,000 - $70,000',
        NOW(),
        NOW()
    );