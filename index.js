const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const puppeteer = require("puppeteer");
const { del } = require("selenium-webdriver/http");

const app = express();

const allowedOrigins = [
  "https://cgpa-leaderboad.vercel.app",
  "https://nitjsr.vercel.app",
  "https://cgpanitjsr.vercel.app",
  "https://cgpa-leaderboard.vercel.app",
  "http://localhost:3000",
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET, POST",
}));

// Load environment variables
dotenv.config();
const id = process.env.regn;
const pwd = process.env.pwd;
const url1 = process.env.login_url;
const url2 = process.env.attendacnce_url;
const port = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const fetchAttendance = async (regn) => {
  let browser;
  try {
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Step 1: Login
    // console.log(url1)
    await page.goto(url1, { waitUntil: "networkidle2" });
    await page.type("#txtuser_id", id);
    await page.type("#txtpassword", pwd);
    await page.click("#btnsubmit");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    // await delay(5000)
    // Step 2: Navigate to attendance page
    await page.goto(url2, { waitUntil: "networkidle2" });

    // await delay(5000)
    // Step 3: Interact with dropdown and select student
    const studentName = await page.evaluate((regn) => {
      const select = document.querySelector("#ContentPlaceHolder1_ddlroll");
      if (select) {
        select.removeAttribute("disabled");
        const optionToSelect = Array.from(select.options).find((option) => option.value === regn);
        if (optionToSelect) {
          optionToSelect.selected = true;
          select.dispatchEvent(new Event("change"));
          // delay(2000)
          return optionToSelect.text.split("-")[1].trim(); // Extract student name
        }
      }
      return null;
    }, regn);
    await delay(2000)
    if (!studentName) {
      return { success: false, message: "Attendance not available on portal for this regn..." };
    }

    // Wait for the attendance table to load
    await page.waitForSelector("#ContentPlaceHolder1_gv");

    // Step 4: Extract attendance data
    const attendance = await page.evaluate(() => {
      const table = document.querySelector("#ContentPlaceHolder1_gv");
      const rows = Array.from(table.querySelectorAll("tr"));
      return rows.map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()));
    });

    return {
      success: true,
      data: {
        student_name: studentName,
        attendance: attendance,
      },
      message: "Attendance fetched successfully...",
    };
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return { success: false, message: "An error occurred while fetching attendance." };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// POST route to fetch attendance
app.post("/api/v1/att", async (req, res) => {
  const { regn } = req.body;
  const response = await fetchAttendance(regn);
  res.send(response);
});

// Root route
app.get("/", (req, res) => {
  res.send("kya aapke tooth paste mein namak hai?");
});

// Start the server
// console.log(url2)
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
