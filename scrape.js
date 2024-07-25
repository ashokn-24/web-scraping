const cheerio = require("cheerio");
const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const getHtml = async (url) => {
  try {
    const res = await fetch(url);
    return res.text();
  } catch (error) {
    console.log(error);
  }
};

let selectorId = [
  "Tasks",
  "TechnologySkills",
  "WorkActivities",
  "DetailedWorkActivities",
  "WorkContext",
  "Skills",
  "Knowledge",
  "Abilities",
];

const processPage = async (url) => {
  const html = await getHtml(url);
  if (!html) return;

  const $ = cheerio.load(html);

  const z = $("#z option[selected]");
  const zoneId = $(z).attr("value");

  const zone = {};
  const rows = $("tbody tr");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = $(row).find('td[data-title="Code"]').text().trim();
    const job_links = $(row).find("a").attr("href");

    if (job_links) {
      const jobLink = new URL(job_links, url).href;
      const jobHtml = await getHtml(jobLink);
      const $job = cheerio.load(jobHtml);

      const jobCode = $job(".sub")
        .children("div")
        .find("div > div:first")
        .text()
        .trim();

      const getData = (selector) => {
        const wa = $job(`#${selector}`).find("ul");
        const elements = wa.find("li").get();
        const data = [];

        elements.forEach((element, index) => {
          const text = $(element).find("div > div:first").text();

          const newData = {
            id: uuidv4(),
            [selector.toLowerCase()]: text,
            jobCode: jobCode,
          };
          data.push(newData);
        });
        return data;
      };

      selectorId.forEach((selector) => {
        const jobData = getData(selector);
        zone[selector] = jobData;
      });
      return zone;
    }
  }
};

// processPage(`https://www.onetonline.org/find/zone?z=1`);

const saveDataToFile = async (data, selector) => {
  const filePath = path.join(__dirname, "data", `${selector}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Data successfully saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to file ${filePath}:`, error);
  }
};

async function createDir(path) {
  try {
    await fs.stat(path);
    return;
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(path);
    }
  }
}

const main = async () => {
  createDir(path.join(__dirname, "data"));

  for (let i = 1; i <= 3; i++) {
    const startTime = new Date();
    const zoneData = await processPage(
      `https://www.onetonline.org/find/zone?z=${i}`
    );
    const endTime = Date.now();
    console.log(`Completed Zone ${i} in ${(endTime - startTime) / 1000}s`);

    if (zoneData) {
      // Save data for each selector
      selectorId.forEach(async (selector) => {
        // Extract data for the current selector
        const selectorData = zoneData[selector];

        if (selectorData.length > 0) {
          await saveDataToFile(selectorData, selector);
        }
      });
    }
  }
};

main();
