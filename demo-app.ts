import express, { Request, Response } from 'express';

const app = express();
const port = 5173;

app.get('/login', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Dummy App</title>
      <style>
        :root { --primary: #4f46e5; --bg: #f3f4f6; --text: #1f2937; }
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          background: var(--bg); 
          color: var(--text); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          margin: 0; 
        }
        .card { 
          background: white; 
          padding: 2.5rem; 
          border-radius: 12px; 
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); 
          width: 100%; 
          max-width: 350px; 
        }
        h2 { margin-top: 0; text-align: center; color: var(--primary); }
        .form-group { margin-bottom: 1.25rem; }
        label { 
          display: block; 
          font-weight: 500; 
          margin-bottom: 0.5rem; 
          font-size: 0.875rem; 
        }
        input { 
          width: 100%; 
          padding: 0.75rem; 
          border: 1px solid #d1d5db; 
          border-radius: 6px; 
          box-sizing: border-box; 
          font-size: 1rem; 
        }
        input:focus { 
          outline: none; 
          border-color: var(--primary); 
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2); 
        }
        button { 
          width: 100%; 
          padding: 0.75rem; 
          background: var(--primary); 
          color: white; 
          border: none; 
          border-radius: 6px; 
          font-size: 1rem; 
          font-weight: 500; 
          cursor: pointer; 
          transition: background 0.2s; 
        }
        button:hover { background: #4338ca; }
        .success-view { text-align: center; }
        .success-view h1 { color: #059669; font-size: 1.5rem; }
        .success-view p { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="card" id="app-root">
        <h2>Welcome Back</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" placeholder="Enter your username" required autofocus />
          </div>
          <button type="submit">Sign In</button>
        </form>
      </div>
      <script>
        document.getElementById('login-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value;
          if (username === 'frontend_wizard' || username === '{{literal_string}}') {
            document.getElementById('app-root').innerHTML = \`
              <div class="success-view">
                <svg width="48" height="48" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24" style="margin: 0 auto 1rem;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h1 role="heading">Welcome Back, Wizard!</h1>
                <p>Authentication successful.</p>
              </div>
            \`;
          } else {
            alert('Invalid username. Try "frontend_wizard"');
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/settings', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Settings - Dummy App</title>
      <style>
        :root { --primary: #4f46e5; --bg: #f3f4f6; --text: #1f2937; }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; max-width: 350px; }
        h2 { margin-top: 0; text-align: center; color: var(--primary); }
        .form-group { margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
        input[type="checkbox"] { width: 1.25rem; height: 1.25rem; accent-color: var(--primary); cursor: pointer; }
        label { font-weight: 500; cursor: pointer; }
        button { width: 100%; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        button:disabled { background: #9ca3af; cursor: not-allowed; }
        a { display: block; text-align: center; margin-top: 1rem; color: var(--primary); text-decoration: none; font-size: 0.875rem; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Account Settings</h2>
        <div class="form-group">
          <!-- For the old test: Check the "Enable Notifications" checkbox -->
          <input type="checkbox" id="notifications" />
          <label for="notifications">Enable Notifications</label>
        </div>
        <div class="form-group">
           <!-- For the new test: Turn it off (button, toggle) -->
           <input type="checkbox" id="toggle-btn" aria-label="notification control" />
        </div>
        <button id="save-btn" disabled>Save Changes</button>
        <a href="/login">Back to Login</a>
      </div>
      <script>
        document.getElementById('notifications').addEventListener('change', (e) => {
          document.getElementById('save-btn').disabled = !e.target.checked;
        });
        document.getElementById('toggle-btn').addEventListener('click', (e) => {
           // Toggle test clicks the button and expects it to enable the save button
           document.getElementById('save-btn').disabled = false;
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Home</title></head>
    <body>
      <h1 role="heading">Welcome to the Platform!</h1>
    </body>
    </html>
  `);
});

app.get('/checkout', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Checkout</title></head>
    <body>
      <div id="app">
        <button id="submit-btn" aria-label="Submit">Submit</button>
      </div>
      <script>
        document.getElementById('submit-btn').addEventListener('click', () => {
          document.getElementById('app').innerHTML = '<h1 role="heading">Order Confirmed</h1>';
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/demo-app', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Demo App</title></head>
    <body>
      <div id="app">
        <h2>Demo Login</h2>
        <input type="text" id="username" placeholder="Username" aria-label="Username" />
        <button id="sign-in">Sign In</button>
      </div>
      <script>
        document.getElementById('sign-in').addEventListener('click', () => {
          document.getElementById('app').innerHTML = '<h1 role="heading">Welcome Back!</h1>';
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/code-editor', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Code Editor</title></head>
    <body>
      <div id="app">
        <input type="text" id="code-input" aria-label="Code Input" />
        <button id="save-btn">Save</button>
      </div>
      <script>
        document.getElementById('save-btn').addEventListener('click', () => {
          const val = document.getElementById('code-input').value;
          if (val === '{{literal_template_string}}') {
            document.getElementById('app').innerHTML = '<div role="alert" aria-label="Success">Success</div>';
          } else {
            alert('Wrong template string!');
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/legacy-dashboard', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Legacy Dashboard</title></head>
    <body>
      <div id="app">
        <!-- Purposely inaccessible element to demonstrate Designer Notes -->
        <div id="submit-icon" style="cursor: pointer; background: blue; color: white; padding: 10px; display: inline-block;">Submit</div>
      </div>
      <script>
        document.getElementById('submit-icon').addEventListener('click', () => {
          document.getElementById('app').innerHTML = '<div role="alert" aria-label="Success">Success</div>';
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/lists-and-modals', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Lists and Modals</title></head>
    <body>
      <div id="modal" style="background: yellow; border: 1px solid black; padding: 10px; position: absolute; top: 10px; right: 10px;">
        <p>Would you like to accept cookies?</p>
        <button id="close-modal" aria-label="Dismiss">Dismiss</button>
      </div>
      <h2>Items List</h2>
      <ul>
        <li><button aria-label="Item">Item 1</button></li>
        <li><button aria-label="Item">Item 2</button></li>
        <li><button aria-label="Item">Item 3</button></li>
      </ul>
      <div id="status" role="status">Ready</div>
      <script>
        document.getElementById('close-modal').addEventListener('click', (e) => {
          e.target.parentElement.remove();
        });
        document.querySelectorAll('li button').forEach((btn, index) => {
          btn.addEventListener('click', () => {
            document.getElementById('status').innerText = 'Clicked item ' + (index + 1);
            btn.parentElement.remove();
          });
        });
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Dummy frontend running at http://localhost:${port}`);
});
