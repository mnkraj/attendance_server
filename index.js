const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require('body-parser');
const cors = require("cors");
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const app = express();
const allowedOrigins = [
  "https://cgpa-leaderboad.vercel.app",
  "https://nitjsr.vercel.app",
  "https://cgpanitjsr.vercel.app",
  "https://cgpa-leaderboard.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET"
}));

// connectDB();
dotenv.config();
const id = process.env.regn;
const pwd = process.env.pwd;
const url1 = process.env.login_url;
const url2 = process.env.attendacnce_url;
const port = process.env.PORT;



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const buildDriver = () => {
    const options = new chrome.Options()
        .addArguments("--headless", "--disable-gpu", "--window-size=1920,1080");
    return new Builder().forBrowser('chrome').setChromeOptions(options).build();
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const fetchAttendance = async (regn) => {
    const driver = buildDriver();

    try {
        // Step 1: Login
        await driver.get(url1);
        await driver.wait(until.elementLocated(By.id('txtuser_id')), 10000).sendKeys(id);
        await driver.wait(until.elementLocated(By.id('txtpassword')), 10000).sendKeys(pwd);
        await driver.wait(until.elementLocated(By.id('btnsubmit')), 10000).click();
        await driver.wait(
            async () => (await driver.getCurrentUrl()) !== url1,
            15000 // Adjust timeout as needed
        );
        
        // Step 3: Navigate directly to attendance URL
        await driver.get(url2);

        // Step 3: Interact with dropdown and extract student name
        await driver.wait(until.elementLocated(By.id('ContentPlaceHolder1_ddlroll')), 10000);
        const selectElement = await driver.findElement(By.id('ContentPlaceHolder1_ddlroll'));
        await driver.executeScript("arguments[0].removeAttribute('disabled');", selectElement);

        const studentName = await driver.executeScript(
            `const select = document.querySelector('#ContentPlaceHolder1_ddlroll');
             const optionToSelect = Array.from(select.options).find(option => option.value === '${regn}');
             let studentName = "";
             if (optionToSelect) {
                 optionToSelect.selected = true;
                 studentName = optionToSelect.text.split('-')[1].trim();
                 select.dispatchEvent(new Event('change'));
             }
             return studentName;`
        );

        if (!studentName) {
            await driver.quit();
            return { success: false, message: "Attendance not available on portal for this regn..." };
        }

        // Step 4: Wait for attendance data to load
        // await waitForNetworkIdle(driver);
        await delay(2000); // Waits for 2 seconds


        // Step 5: Extract attendance table data
        const attendanceTable = await driver.findElement(By.id('ContentPlaceHolder1_gv'));
        const rows = await attendanceTable.findElements(By.tagName('tr'));
        const attendance = [];

        for (const row of rows) {
            const cells = await row.findElements(By.tagName('td'));
            const cellData = cells.length > 0 ? cells : await row.findElements(By.tagName('th'));
            const rowData = [];
            for (const cell of cellData) {
                const text = await cell.getText();
                rowData.push(text);
            }
            attendance.push(rowData);
        }
        await driver.quit();
        return {
            success: true,
            data: {
                student_name: studentName,
                attendance: attendance,
            },
            message: "Attendance fetched successfully...",
        };
    } catch (err) {
        console.error(err);
        return { success: false, message: "An error occurred while fetching attendance." };
    } finally {
        
    }
};



app.post("/api/v1/att",async (req,res)=>{
    console.log("1")
    const {regn} = req.body;
    const response  = await fetchAttendance(regn)

    res.send(response);
  })







app.get("/",(req,res)=>{
  res.send("kya aapke tooth paste mein namak hai ? ")
})




app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});