
const axios = require("axios");
axios.default.defaults.timeout = 60000;
const moment = require("moment");
const xml2json = require('xml2json');
const fs = require('fs');
const { promisify } = require('util');
const writeFilePromise = promisify(fs.writeFile);
const regression = require("regression");
const { BASE_DATA_DIR, request } = require('./util');
const DATA_DIR = BASE_DATA_DIR;

const VAC_BASE_URL = "https://monitor.uruguaysevacuna.gub.uy/plugin/cda/api/doQuery";

function createDefaultParams(minDate, maxDate) {
    const params = {
        outputIndexId: "1",
        pageSize: "0",
        pageStart: "0",
        sortBy: "",
        paramsearchBox: "",
        outputType: "XML"
    };

    if (minDate) {
        params.paramp_periodo_desde_sk = minDate;
    }
    if (maxDate) {
        params.paramp_periodo_hasta_sk = maxDate;
    }

    return params;
}

async function getValidDatesData() {
    const params = createDefaultParams();
    params.path = "/public/Epidemiologia/Vacunas Covid/Paneles/Vacunas Covid/VacunasCovid.cda";
    params.dataAccessId = "sql_fechas_validas";
    return await request(VAC_BASE_URL, params);
}

async function getVacHistoryData(minDate, maxDate) {
    const params = createDefaultParams(minDate, maxDate);
    params.path = "/public/Epidemiologia/Vacunas Covid/Paneles/Vacunas Covid/VacunasCovid.cda";
    params.dataAccessId = "sql_evolucion";
    return await request(VAC_BASE_URL, params);
}

async function getVacTotalData(minDate, maxDate) {
    const params = createDefaultParams(minDate, maxDate);
    params.path = "/public/Epidemiologia/Vacunas Covid/Paneles/Vacunas Covid/VacunasCovid.cda";
    params.dataAccessId = "sql_indicadores_generales";
    return await request(VAC_BASE_URL, params);
}

async function getVacTypeData(minDate, maxDate) {
    const params = createDefaultParams(minDate, maxDate);
    params.paramp_periodo_desde_sk = minDate;
    params.paramp_periodo_hasta_sk = maxDate;
    params.path = "/public/Epidemiologia/Vacunas Covid/Paneles/Vacunas Covid/VacunasCovid.cda";
    params.dataAccessId = "sql_vacunas_tipo_vacuna";
    return await request(VAC_BASE_URL, params);
}

async function downloadUruguayVaccinationData() {
    let vacDataFailed = false;

    const vacData = {
        history: {
            date: [],
            total: [],
            coronavac: [],
            pfizer: [],
            astrazeneca: []
        },
        date: "",
        todayDate: "",
        todayTotal: 0,
        total: 0,
        firstDoseTotal: 0,
        secondDoseTotal: 0,
        coronavacTotal: 0,
        astrazenecaTotal: 0,
        pfizerTotal: 0,
        goal: 2800000,
        eta: null
    }

    try {
        const validDatesData = await getValidDatesData();
        const validDatesDataObj = xml2json.toJson(validDatesData, { object: true });
        const validDatesMetadata = validDatesDataObj.CdaExport.MetaData.ColumnMetaData;
        let minDateIndex = -1, maxDateIndex = -1;
        for (let i = 0; i < validDatesMetadata.length; ++i) {
            const metadataCol = validDatesMetadata[i];
            const name = metadataCol.name.toLowerCase();
            if (name.includes("fecha_minima")) {
                minDateIndex = parseInt(metadataCol.index);
            }
            else if (name.includes("fecha_maxima")) {
                maxDateIndex = parseInt(metadataCol.index);
            }
        }

        if (minDateIndex == -1 || maxDateIndex == -1) {
            throw new Error("Can't find valid dates indexes");
        }

        const validDatesCol = validDatesDataObj.CdaExport.ResultSet.Row.Col;

        const minDate = moment(validDatesCol[minDateIndex], "DD-MM-YYYY");
        const maxDate = moment(validDatesCol[maxDateIndex], "DD-MM-YYYY");
        const minDateStr = minDate.format("YYYYMMDD");
        const maxDateStr = maxDate.format("YYYYMMDD");

        vacData.date = maxDate.format("YYYY-MM-DD")

        const [vacHistoryData, vacTotalData, vacTypeData] = await Promise.allSettled([getVacHistoryData(minDateStr, maxDateStr), getVacTotalData(minDateStr, maxDateStr), getVacTypeData(minDateStr, maxDateStr)]);

        if (vacHistoryData.status === "fulfilled") {
            const vacHistoryDataObj = xml2json.toJson(vacHistoryData.value, { object: true });
            const vacHistoryMetadata = vacHistoryDataObj.CdaExport.MetaData.ColumnMetaData;

            let dateIndex = -1, coronavacIndex = -1, pfizerIndex = -1, astrazenecaIndex = -1;
            for (let i = 0; i < vacHistoryMetadata.length; ++i) {
                const metadataCol = vacHistoryMetadata[i];
                const name = metadataCol.name.toLowerCase();

                if (name.includes("fecha")) {
                    dateIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("sinovac")) {
                    coronavacIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("pfizer")) {
                    pfizerIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("astrazeneca")) {
                    astrazenecaIndex = parseInt(metadataCol.index);
                }
            }

            if (dateIndex == -1 || coronavacIndex == -1 || pfizerIndex == -1 || astrazenecaIndex == -1) {
                throw new Error("Can't find vac data indexes");
            }

            const rows = vacHistoryDataObj.CdaExport.ResultSet.Row;
            let lastDate = null;
            for (let i = 0; i < rows.length; ++i) {
                const data = rows[i].Col;

                const date = data[dateIndex].replace("-", "/");
                let coronavac = data[coronavacIndex];
                if (coronavac == null || (typeof coronavac === "object" && coronavac.isNull === "true")) {
                    coronavac = 0;
                }
                let pfizer = data[pfizerIndex];
                if (pfizer == null || (typeof pfizer === "object" && pfizer.isNull === "true")) {
                    pfizer = 0;
                }

                let astrazeneca = data[astrazenecaIndex];
                if (astrazeneca == null || (typeof astrazeneca === "object" && astrazeneca.isNull === "true")) {
                    astrazeneca = 0;
                }

                coronavac = parseInt(coronavac);
                pfizer = parseInt(pfizer);
                astrazeneca = parseInt(astrazeneca);
                const total = coronavac + pfizer + astrazeneca;

                vacData.history.date.push(date);
                vacData.history.total.push(total);
                vacData.history.coronavac.push(coronavac);
                vacData.history.pfizer.push(pfizer);
                vacData.history.astrazeneca.push(astrazeneca);

                lastDate = date;
            }

            if (lastDate == null) {
                vacDataFailed = true;
                console.log("Vac history inconsistent: empty");
            }
            else {
                let minRegisters = 32;

                if (vacData.history.date.length < minRegisters) {
                    vacDataFailed = true;
                    console.log("Vac history inconsistent: got " + vacData.history.date.length + " registers, at least " + minRegisters + " required");
                }
            }

        }
        else {
            console.log("Error getting vac history: " + vacHistoryData.reason);
            vacDataFailed = true;
        }

        ///////////

        if (vacTotalData.status === "fulfilled") {
            const vacTotalsDataObj = xml2json.toJson(vacTotalData.value, { object: true });
            const vacTotalsMetadata = vacTotalsDataObj.CdaExport.MetaData.ColumnMetaData;

            let todayDateIndex = -1, totalVacIndex = -1, todayTotalIndex = -1, firstDoseIndex = -1, secondDoseIndex = -1;
            for (let i = 0; i < vacTotalsMetadata.length; ++i) {
                const metadataCol = vacTotalsMetadata[i];
                const name = metadataCol.name.toLowerCase();

                if (name.includes("hora")) {
                    todayDateIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("dosis pais")) {
                    totalVacIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("actoshoy")) {
                    todayTotalIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("per1")) {
                    firstDoseIndex = parseInt(metadataCol.index);
                }
                else if (name.includes("per2")) {
                    secondDoseIndex = parseInt(metadataCol.index);
                }
            }

            if (todayDateIndex == -1 || totalVacIndex == -1 || todayTotalIndex == -1 || firstDoseIndex == -1 || secondDoseIndex == -1) {
                throw new Error("Can't find vac total data indexes");
            }

            const totalRows = vacTotalsDataObj.CdaExport.ResultSet.Row;
            const totalsData = totalRows.Col;

            const todayDate = totalsData[todayDateIndex];
            const todayTotal = totalsData[todayTotalIndex];
            const totalVac = totalsData[totalVacIndex];
            const firstDoseTotal = totalsData[firstDoseIndex];
            const secondDoseTotal = totalsData[secondDoseIndex];

            vacData.todayDate = todayDate;
            vacData.todayTotal = parseInt(todayTotal);
            vacData.firstDoseTotal = parseInt(firstDoseTotal);
            vacData.secondDoseTotal = parseInt(secondDoseTotal);
            const dataTotalVac = parseInt(totalVac);
            vacData.total = Math.max(dataTotalVac, vacData.firstDoseTotal + vacData.secondDoseTotal);

            if (dataTotalVac <= 0) {
                console.log("Vac total inconsistent: <= 0");
                vacDataFailed = true;
            }
        }
        else {
            console.log("Error getting vac total: " + vacTotalData.reason);
            vacDataFailed = true;
        }

        ///////

        if (vacTypeData.status === "fulfilled") {
            const vacTypeDataObj = xml2json.toJson(vacTypeData.value, { object: true });
            const vacTypeRows = vacTypeDataObj.CdaExport.ResultSet.Row;
            let coronavacTotal = 0;
            let pfizerTotal = 0;
            let astrazenecaTotal = 0;
            for (let i = 0; i < vacTypeRows.length; ++i) {
                const col = vacTypeRows[i].Col;
                const name = col[0];
                const value = col[1];
                if (name.toLowerCase().includes("coronavac")) {
                    coronavacTotal = parseInt(value);
                }
                else if (name.toLowerCase().includes("pfizer")) {
                    pfizerTotal = parseInt(value);
                }
                else if (name.toLowerCase().includes("astrazeneca")) {
                    astrazenecaTotal = parseInt(value);
                }
            }

            vacData.coronavacTotal = coronavacTotal;
            vacData.pfizerTotal = pfizerTotal;
            vacData.astrazenecaTotal = astrazenecaTotal;
            if (vacData.total == 0) {
                vacData.total = coronavacTotal + pfizerTotal + astrazenecaTotal;
            }

            if (coronavacTotal == 0 || pfizerTotal == 0 || astrazenecaTotal == 0) {
                console.log("Vac type inconsistent: Sinovac or Pfizer == 0");
                vacDataFailed = true;
            }
        }
        else {
            console.log("Error getting vac type: " + vacTypeData.reason);
            vacDataFailed = true;
        }

        const totalPoints = [];
        let curTotal = 0;
        for (let i = vacData.history.total.length - 28; i < vacData.history.total.length; ++i) {
            curTotal += vacData.history.total[i];
            totalPoints.push([i, curTotal]);
        }

        const result = regression.linear(totalPoints);
        const m = result.equation[0];
        const c = result.equation[1];
        const x = (2 * vacData.goal - c) / m;
        const eta = minDate.add(x, 'days');
        vacData.eta = eta.format("YYYY-MM-DD");

    } catch (e) {
        console.log("Error getting vaccination data. " + e.name + ": " + e.message);
        vacDataFailed = true;
    }

    const vacDataFile = DATA_DIR + "uruguayVaccination.json";

    if (!vacDataFailed || !fs.existsSync(vacDataFile)) {
        await writeFilePromise(vacDataFile, JSON.stringify(vacData));
    }
}

module.exports = {
    downloadUruguayVaccinationData: downloadUruguayVaccinationData
};