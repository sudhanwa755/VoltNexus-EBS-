<a name="readme-top"></a>

<div align="center">

  <br />
  <img src="https://cdn-icons-png.flaticon.com/512/2933/2933116.png" alt="Logo" width="80" height="80">

  <h1 style="font-size: 3rem; font-weight: bold; margin-top: 0;">⚡ Electricity Billing System</h1>

  <p style="font-size: 1.2rem; color: #555;">
    <b>The Next-Gen Electricity Billing System</b>
  </p>

  <p>
    <i>A modern, secure, and real-time platform for comprehensive utility management.</i>
  </p>

  <p>
    <a href="https://github.com/sudhanwa755/EBS/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/sudhanwa755/EBS?style=for-the-badge&color=orange" alt="Contributors">
    </a>
    <a href="https://github.com/sudhanwa755/EBS/network/members">
      <img src="https://img.shields.io/github/forks/sudhanwa755/EBS?style=for-the-badge&color=blue" alt="Forks">
    </a>
    <a href="https://github.com/sudhanwa755/EBS/stargazers">
      <img src="https://img.shields.io/github/stars/sudhanwa755/EBS?style=for-the-badge&color=yellow" alt="Stars">
    </a>
    <a href="https://github.com/sudhanwa755/EBS/issues">
      <img src="https://img.shields.io/github/issues/sudhanwa755/EBS?style=for-the-badge&color=red" alt="Issues">
    </a>
    <a href="https://github.com/sudhanwa755/EBS/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/sudhanwa755/EBS?style=for-the-badge&color=green" alt="License">
    </a>
  </p>

  <br />


  <a href="#demo"><strong>View Demo »</strong></a> · 
  <a href="#installation"><strong>Setup Guide »</strong></a> · 
  <a href="https://github.com/sudhanwa755/EBS/issues"><strong>Report Bug »</strong></a>

</div>

<br />

---

## 🚀 Overview

**Electricity Billing System** is a robust, vanilla JavaScript application powered by **Supabase**. It bridges the gap between utility providers and consumers, offering a seamless interface for tracking consumption, managing tariffs, and processing payments securely.

> **Why Electricity Billing System?**
> Unlike legacy systems, Electricity Billing System operates in **real-time** with Row Level Security (RLS), ensuring data privacy while delivering instant analytics.

---

## 🧩 Tech Stack

<div align="center">

| **Frontend Layer** | **Backend Layer** | **Tools & DevOps** |
|:---:|:---:|:---:|
| ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat-square&logo=html5&logoColor=white) | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white) | ![Git](https://img.shields.io/badge/git-%23F05033.svg?style=flat-square&logo=git&logoColor=white) |
| ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white) | ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=flat-square&logo=postgresql&logoColor=white) | ![NPM](https://img.shields.io/badge/NPM-%23000000.svg?style=flat-square&logo=npm&logoColor=white) |
| ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat-square&logo=javascript&logoColor=%23F7DF1E) | ![Auth](https://img.shields.io/badge/Auth-Secure-red?style=flat-square) | ![VS Code](https://img.shields.io/badge/VS%20Code-0078d7.svg?style=flat-square&logo=visual-studio-code&logoColor=white) |

</div>

---

## 🌟 Key Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3 align="center">👤 For Customers</h3>
      <ul>
        <li>✨ <b>Self-Service Portal:</b> Auto-generated Meter IDs (<code>MTR-XXXXXX</code>).</li>
        <li>📊 <b>Interactive Dashboard:</b> Visual usage charts & history.</li>
        <li>📃 <b>Bill Management:</b> Filter, search, and download <b>PDF bills</b>.</li>
        <li>💳 <b>Payments:</b> Secure online payment simulation.</li>
        <li>🌙 <b>UI/UX:</b> Responsive design with Dark Mode.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3 align="center">🛡 For Admins</h3>
      <ul>
        <li>📈 <b>Macro Analytics:</b> System-wide consumption data.</li>
        <li>⚡ <b>Tariff Control:</b> Create dynamic tiered pricing plans.</li>
        <li>👥 <b>User Management:</b> CRUD operations for users & meters.</li>
        <li>📂 <b>Reports:</b> Export data to <b>CSV & PDF</b>.</li>
        <li>🔒 <b>Security:</b> Role-Based Access Control (RBAC).</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🧱 Database Schema

The architecture utilizes **8 optimized tables** with strictly enforced Foreign Keys and RLS policies.

| Table Name | Description |
| :--- | :--- |
| 🟢 `profiles` | Stores auth data and links Roles (Admin/Customer). |
| 🟢 `customer_info` | Links Profiles to Meter Numbers & Addresses. |
| 🟢 `bills` | The ledger for generated bills, status, and amounts. |
| 🟢 `consumption` | Granular meter reading data (Units used). |
| 🟢 `tariff_plans` | Logic for pricing tiers (Unit/Cost). |
| 🟡 `customer_tariff_mapping` | Links specific customers to specific tariff plans. |
| 🔴 `consumption_limits` | Sets thresholds for usage alerts. |
| 🔴 `consumption_alerts` | Logs triggered alerts for high usage. |

---

## 🛠 Installation & Setup



### 1. Prerequisites
* A [Supabase](https://supabase.com/) Account.
* Node.js (optional, for `http-server`) or Python.

### 2. Clone the Repository
```bash
git clone [https://github.com/sudhanwa755/EBS.git](https://github.com/sudhanwa755/EBS.git)
cd EBS

### 3\. Configure Backend (Supabase)

1.  Create a new project in Supabase.
2.  Go to the **SQL Editor**.
3.  Copy the contents of `clean-setup-FIXED.sql` and run it.
4.  *Verify that all 8 tables are created successfully.*

### 4\. Link Credentials

Create a file at `frontend/assets/js/config.js`:

```javascript
export const CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_PROJECT_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 5\. Launch Application

You can use any local server.

**Using Python:**

```bash
cd frontend
python -m http.server 8000
```

**Using Node (http-server):**

```bash
cd frontend
npx http-server
```

**Using VS Code:**
Right-click `index.html` and select **"Open with Live Server"**.

\</details\>

-----

## 🔐 Admin Access

By default, new users are Customers. To promote a user to **Admin**:

1.  Register a new user via the app UI.
2.  Go to Supabase SQL Editor.
3.  Run:
    ```sql
    UPDATE profiles 
    SET role = 'ADMIN' 
    WHERE email = 'your-email@example.com';
    ```

-----

## 📂 Project Structure

```sh
frontend/
├── admin/              # Admin-specific logic & views
├── assets/
│   ├── css/            # Tailwind & Custom Styles
│   ├── js/             # Core Modules (Auth, Bill Logic)
│   └── images/         # Static Assets
├── components/         # Reusable UI fragments
├── index.html          # Landing Page
├── dashboard.html      # Main User Interface
└── ...
```

-----

## 🐞 Troubleshooting

\<details\>
\<summary\>\<strong\>Issue: Admin Dashboard shows 500 Error\</strong\>\</summary\>

  * **Cause:** The `is_admin()` function might be missing in Postgres.
  * **Fix:** Re-run the SQL setup script specifically for the RLS policies section.

\</details\>

\<details\>
\<summary\>\<strong\>Issue: PDF Generation has dummy data\</strong\>\</summary\>

  * **Cause:** The user profile is missing address details.
  * **Fix:** Go to Profile Settings and ensure all fields are filled before downloading.

\</details\>

-----

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

-----

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

-----


## 📬 Contact

**Project Link:** [https://github.com/sudhanwa755/EBS](https://github.com/sudhanwa755/EBS)

<div align="center">

### Sudhanwa Kulkarni

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:sudhanwalatur@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sudhanwa-kulkarni/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sudhanwa755)

</div>

<br />
<br />

---

<div align="center">

### ⭐️ Show your support ⭐️
<p>If you found this project helpful, please give it a star!</p>

<a href="https://github.com/sudhanwa755/EBS/stargazers">
  <img src="https://img.shields.io/github/stars/sudhanwa755/EBS?style=social" alt="GitHub Stars">
</a>

<br />
<br />

<p>
  Made with ❤️ and ☕ by <a href="https://github.com/sudhanwa755"><b>Sudhanwa Kulkarni</b></a>
</p>

<p style="font-size: 0.8rem; color: #888;">
  © 2025 Electricity Billing System. All Rights Reserved.
</p>

</div>

<p align="center">
  <a href="#readme-top">⬆️ Back to Top</a>
</p>
```
