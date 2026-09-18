const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sticky Wall</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: #A8B5A8;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .app-container {
      background: #fff;
      width: 100%;
      max-width: 1200px;
      height: 85vh;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      display: flex;
      overflow: hidden;
    }
    
    /* Sidebar */
    .sidebar {
      width: 260px;
      background: #F9F9F9;
      padding: 24px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #eee;
    }
    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .sidebar-header h2 { font-size: 24px; font-weight: 700; color: #333; }
    .menu-icon { cursor: pointer; color: #666; }
    
    .search-bar {
      background: #fff;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      color: #999;
    }
    .search-bar input { border: none; outline: none; margin-left: 8px; width: 100%; }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      margin: 20px 0 10px 0;
      letter-spacing: 0.5px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      color: #555;
      font-size: 14px;
      margin-bottom: 4px;
      transition: background 0.2s;
    }
    .nav-item:hover { background: #f0f0f0; }
    .nav-item.active { background: #f0f0f0; font-weight: 600; color: #333; }
    .nav-item span { margin-left: 12px; flex-grow: 1; }
    .nav-item .count {
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      color: #888;
    }
    .nav-item .icon { width: 16px; text-align: center; margin-right: 4px; }
    
    .add-list {
      display: flex;
      align-items: center;
      color: #666;
      font-size: 14px;
      cursor: pointer;
      margin-top: 8px;
    }
    
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .tag {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    .tag-1 { background: #D4F1F4; color: #555; }
    .tag-2 { background: #FFD6D6; color: #555; }
    .tag-add { background: #f0f0f0; color: #888; }
    
    .sidebar-footer {
      margin-top: auto;
      border-top: 1px solid #eee;
      padding-top: 16px;
    }
    
    /* Main Content */
    .main-content {
      flex-grow: 1;
      padding: 32px;
      overflow-y: auto;
      background: #fff;
    }
    .main-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .main-header h1 { font-size: 32px; font-weight: 700; color: #333; }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    
    .card {
      border-radius: 12px;
      padding: 20px;
      min-height: 220px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
    }
    .card h3 { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #333; }
    .card p { font-size: 13px; line-height: 1.5; color: #555; margin-bottom: 8px; }
    .card ul { list-style: none; padding-left: 0; }
    .card li { font-size: 13px; color: #555; margin-bottom: 6px; padding-left: 12px; position: relative; }
    .card li::before { content: "-"; position: absolute; left: 0; color: #888; }
    
    .card-yellow { background: #FFF4C4; }
    .card-blue { background: #D4F1F4; }
    .card-pink { background: #FFD6D6; }
    .card-orange { background: #FFDAB9; }
    .card-grey { background: #F0F0F0; justify-content: center; align-items: center; cursor: pointer; }
    .card-grey:hover { background: #e8e8e8; }
    .plus-icon { font-size: 48px; color: #333; font-weight: 300; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Menu</h2>
        <div class="menu-icon">☰</div>
      </div>
      
      <div class="search-bar">
        <span>🔍</span>
        <input type="text" placeholder="Search">
      </div>
      
      <div class="section-title">Tasks</div>
      <div class="nav-item">
        <span class="icon">📅</span>
        <span>Upcoming</span>
        <span class="count">12</span>
      </div>
      <div class="nav-item">
        <span class="icon">📋</span>
        <span>Today</span>
        <span class="count">4</span>
      </div>
      <div class="nav-item">
        <span class="icon">🗓</span>
        <span>Calendar</span>
      </div>
      <div class="nav-item active">
        <span class="icon">📌</span>
        <span>Sticky Wall</span>
      </div>
      
      <div class="section-title">Lists</div>
      <div class="nav-item">
        <span class="icon" style="color:#FFDAB9">■</span>
        <span>Personal</span>
        <span class="count">3</span>
      </div>
      <div class="nav-item">
        <span class="icon" style="color:#D4F1F4">■</span>
        <span>Work</span>
        <span class="count">3</span>
      </div>
      <div class="nav-item">
        <span class="icon" style="color:#FFF4C4">■</span>
        <span>List 1</span>
        <span class="count">3</span>
      </div>
      <div class="add-list">
        <span style="margin-right: 8px;">+</span> Add New List
      </div>
      
      <div class="section-title">Tags</div>
      <div class="tags-container">
        <div class="tag tag-1">Tag 1</div>
        <div class="tag tag-2">Tag 2</div>
        <div class="tag tag-add">+ Add Tag</div>
      </div>
      
      <div class="sidebar-footer">
        <div class="nav-item">
          <span class="icon">⚙️</span>
          <span>Settings</span>
        </div>
        <div class="nav-item">
          <span class="icon">🚪</span>
          <span>Sign out</span>
        </div>
      </div>
    </aside>
    
    <main class="main-content">
      <div class="main-header">
        <h1>Sticky Wall</h1>
      </div>
      
      <div class="grid">
        <div class="card card-yellow">
          <h3>Social Media</h3>
          <ul>
            <li>Plan social content</li>
            <li>Build content calendar</li>
            <li>Plan promotion and distribution</li>
          </ul>
        </div>
        
        <div class="card card-blue">
          <h3>Content Strategy</h3>
          <p>Would need time to get insights (goals, personas, budget, audits), but after, it would be good to focus on assembling my team (start with SEO specialist, then perhaps an email marketer?). Also need to brainstorm on tooling.</p>
        </div>
        
        <div class="card card-pink">
          <h3>Email A/B Tests</h3>
          <ul>
            <li>Subject lines</li>
            <li>Sender</li>
            <li>CTA</li>
            <li>Sending times</li>
          </ul>
        </div>
        
        <div class="card card-orange">
          <h3>Banner Ads</h3>
          <ul>
            <li>Notes from the workshop</li>
            <li>Sizing matters</li>
            <li>Choose distinctive imagery</li>
            <li>The landing page must match the display ad</li>
          </ul>
        </div>
        
        <div class="card card-grey">
          <div class="plus-icon">+</div>
        </div>
      </div>
    </main>
  </div>
</body>
</html>
  `);
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
