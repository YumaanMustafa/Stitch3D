// import fetch from "node-fetch"; // Using native fetch


async function verify() {
    try {
        // 1. Login
        console.log("Logging in as Admin...");
        const loginRes = await fetch("http://localhost:5000/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@stitch.local", password: "admin123" })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) throw new Error("Login failed: " + JSON.stringify(loginData));
        const token = loginData.token;
        console.log("LOGIN SUCCESS. Token acquired.");

        // 2. Fetch Users
        console.log("Fetching Users...");
        const usersRes = await fetch("http://localhost:5000/api/admin/users", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (!usersRes.ok) throw new Error("Fetch failed: " + JSON.stringify(usersData));

        console.log("USERS FETCHED SUCCESSFULLY:");
        console.table(usersData);

    } catch (err) {
        console.error("VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

verify();
