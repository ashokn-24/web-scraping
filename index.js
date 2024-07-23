const cheerio = require("cheerio");
const fs = require("fs/promises");
const path = require("path");

const getHtml = async (url) => {
  try {
    const res = await fetch(url);
    return res.text();
  } catch (error) {
    console.log(error);
  }
};

const processPage = async (url) => {
  const html = await getHtml(url);
  if (!html) return;

  const $ = cheerio.load(html);

  const z = $("#z option[selected]");
  const zoneId = $(z).attr("value");
  const zoneDescription = $(z).text().split(":")[1].trim();

  const rows = $("tbody tr");

  const zone = {
    zone: zoneId,
    description: zoneDescription,
    occupations: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = $(row).find('td[data-title="Code"]').text().trim();
    const title = $(row).find('td[data-title="Occupation"]').text().trim();
    const job_links = $(row).find("a").attr("href");

    let reportedJobTitles = [];

    if (job_links) {
      const jobLink = new URL(job_links, url).href;
      const jobHtml = await getHtml(jobLink);
      const $job = cheerio.load(jobHtml);
      const titlesText = $job("div[id='content']")
        .children("p:nth-of-type(2)")
        .contents("b")
        .text();
      reportedJobTitles = titlesText.split(":").map((title) => title.trim());
      reportedJobTitles.shift(); // Remove first element if needed
      reportedJobTitles = [...new Set(reportedJobTitles)]; // Remove duplicates
    }

    zone.occupations.push({
      code: code,
      title: title,
      reportedJobTitles: reportedJobTitles,
    });
  }

  return zone;
};

(async () => {
  const zones = ["one", "two", "three"];

  try {
    await createDir(path.join(__dirname, "data"));

    for (let i = 0; i < zones.length; i++) {
      const startTime = Date.now();
      const data = await processPage(
        `https://www.onetonline.org/find/zone?z=${i + 1}`
      );
      const endTime = Date.now();

      const filePath = path.join(__dirname, "data", `zone-${zones[i]}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), {
        encoding: "utf-8",
      });

      console.log(
        `Completed Zone ${zones[i]} in ${(endTime - startTime) / 1000}s`
      );
    }

    console.log("Writing JSON to file");
  } catch (err) {
    console.log("Error while scrapping", err);
  }
})();

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
