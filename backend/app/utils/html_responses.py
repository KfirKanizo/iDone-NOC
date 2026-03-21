def get_action_response_html(title: str, message: str, is_success: bool) -> str:
    icon = "✅" if is_success else "ℹ️"
    border_color = "#10b981" if is_success else "#3b82f6"
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      font-family: 'Inter', Arial, sans-serif;
      background: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }}
    .card {{
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      padding: 48px 40px;
      max-width: 420px;
      text-align: center;
      border-top: 6px solid {border_color};
    }}
    .icon {{
      font-size: 64px;
      margin-bottom: 16px;
    }}
    h1 {{
      color: #1e293b;
      font-size: 24px;
      margin: 0 0 12px 0;
    }}
    p {{
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }}
    .logo {{
      margin-top: 32px;
      opacity: 0.5;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">{icon}</div>
    <h1>{title}</h1>
    <p>{message}</p>
    <img class="logo" src="https://www.idone.co.il/assets/images/logos/idone-logo.png" height="40" alt="iDone">
  </div>
</body>
</html>"""
