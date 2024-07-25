const cheerio = require("cheerio");
const fs = require("fs/promises");
const { v4: uuidV4 } = require("uuid");
const pluralize = require("pluralize");
const path = require("path");
const _ = require("lodash");

const MASTER_DATA = {
  ZONES: [
    {
      id: uuidV4(),
      description: "Little or No Preparation Needed",
      zone: 1,
    },
    {
      id: uuidV4(),
      description: "Some Preparation Needed",
      zone: 2,
    },
    {
      id: uuidV4(),
      description: "Medium Preparation Needed",
      zone: 3,
    },
  ],
  JOB_CODES: [],
  JOBS: [],
  Tasks: [],
  TechnologySkills: [],
  WorkActivities: [],
  DetailedWorkActivities: [],
  WorkContext: [],
  Skills: [],
  Knowledge: [],
  Abilities: [],
};

const load = async (url) => {
  try {
    const res = await fetch(url);
    const html = await res.text();

    return html;
  } catch (err) {
    console.log(err);
  }
};

const getAllJobCodes = async () => {
  try {
    const codes = [];

    for (let i = 1; i <= 3; i++) {
      const html = await load(`https://www.onetonline.org/find/zone?z=${i}`);
      const $ = cheerio.load(html);
      const tableRows = $("#content > table > tbody").find("tr").get();

      tableRows.forEach((row) => {
        codes.push($(row).find("td:first").text());
      });
    }

    return codes;
  } catch (err) {
    console.log(err);
  }
};

const getJobDetails = async (url) => {
  // {
  //   code,
  //   title,
  //   reportedTitles,
  //   zoneId,
  // }
  const jobDetails = {};

  try {
    const html = await load(url);
    const $ = cheerio.load(html);

    // Get Job Data (code, title, reportedTitle)
    const code = $("#content > h1 > span.sub").find("div > div:first").text();
    const title = $("#content > h1 > span.main").text();

    let reportedTitles = $("#content > p:nth-child(3)")
      .text()
      .split(":")
      .map((title) => title.trim());
    reportedTitles.shift();
    reportedTitles = [...new Set(reportedTitles)];
    const zoneDescription = $("#JobZone > dl > dd:nth-child(2)")
      .text()
      ?.split(":")[1]
      ?.trim();
    const jobZone = MASTER_DATA.ZONES.filter((zone) => {
      return zone.description.toLowerCase() === zoneDescription.toLowerCase();
    })[0];
    const zoneId = jobZone.id;

    MASTER_DATA.JOBS.push({
      code,
      title,
      reportedTitles,
      zoneId,
    });

    // Get Job Tasks and other Job related data
    const selectors = [
      "Tasks",
      "TechnologySkills",
      "WorkActivities",
      "DetailedWorkActivities",
      "WorkContext",
      "Skills",
      "Knowledge",
      "Abilities",
    ];

    for (let selector of selectors) {
      const list = $(`#${selector}`).find("li").get();
      const p = _.camelCase(selector);
      jobDetails[p] = [];

      list.forEach((item) => {
        const data = {
          id: uuidV4(),
          [pluralize.singular(selector.toLowerCase())]: $(item)
            .find("div > div:first")
            .text(),
          jobCode: code,
        };

        MASTER_DATA[selector].push(data);
      });
    }
  } catch (err) {
    console.log(err);
  }
};

(async () => {
  try {
    createDataDir();

    const jobCodes = await getAllJobCodes();
    MASTER_DATA.JOB_CODES = jobCodes;

    // All job details
    console.log("Started");
    const startTime = Date.now();
    for (let i = 0; i < MASTER_DATA.JOB_CODES.length; i++) {
      await getJobDetails(
        `https://www.onetonline.org/link/summary/${MASTER_DATA.JOB_CODES[i]}`
      );
      console.log(
        `Completed ${MASTER_DATA.JOB_CODES[i]} ${i + 1}/${
          MASTER_DATA.JOB_CODES.length
        }`
      );
    }
    const endTime = Date.now();
    console.log(`Extracted data in ${(endTime - startTime) / 1000}s`);

    console.log("Writing to file..");
    for (let [key, value] of Object.entries(MASTER_DATA)) {
      await writeToFile(
        path.join(__dirname, "data", `${_.camelCase(key)}.json`),
        JSON.stringify(value, null, 4)
      );
    }
    console.log("Successfully written to file");
  } catch (err) {
    console.log("Error", err);
  }
})();

async function writeToFile(filepath, content) {
  try {
    await fs.writeFile(filepath, content, {
      encoding: "utf-8",
    });
  } catch (err) {
    throw new Error(err);
  }
}

async function createDataDir() {
  try {
    await fs.stat(path.join(__dirname, "data"));
    return;
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(path.join(__dirname, "data"));
    }
  }
}
