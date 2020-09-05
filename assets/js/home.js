import data from "./data/uruguay.json";
import langEs from "../../i18n/es.json";
import langEn from "../../i18n/en.json";
import "./chartjs-elements";
import "./chartjs-tooltipsutil";
import nfCookies from './nf-cookies'
import burger from './burger'
import './icons'
import population from "./data/world-population.json";
import region from "./data/region.json";
import departmentsData from "./data/uruguayDepartments.json"
import deathsData from "./data/uruguayDeaths.json"

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", main);
} else {
    main();
}

function getTotal(values) {
    return values.reduce(function (prev, cur) { return prev + cur });
}

function average(array, startIndex, length) {
    var sum = 0;
    for (var i = 0; i < length && (i + startIndex) < array.length; ++i) {
        sum += array[i + startIndex];
    }
    var avg = sum / length;
    return avg;
}

function movingAverage(array, prev, next) {
    var results = [];
    for (var i = 0; i < prev; ++i) {
        results.push(null);
    }
    for (var i = prev; i < (array.length - next); ++i) {
        results.push(average(array, i - prev, prev + next + 1));
    }
    for (var i = 0; i < next; ++i) {
        results.push(null);
    }
    return results;
}

function createMovingAverageDataset(data, length, color) {
    return {
        type: "line",
        fill: false,
        borderWidth: 1,
        pointRadius: 0,
        borderColor: color,
        data: movingAverage(data, length, length),
        label: "AVG",
    };
}

function createDefaultChartOptions() {
    return {
        animation: {
            duration: 0
        },
        legend: {
            labels: {
                filter: function (item) {
                    return !item.text.includes("AVG");
                }
            }
        }
    };
}

function main() {
    burger();
    nfCookies();

    var langs = {
        es: langEs,
        en: langEn
    }

    var htmlLang = document.documentElement.getAttribute("lang");

    var lang = langs.es;
    if (langs.hasOwnProperty(htmlLang)) {
        lang = langs[htmlLang];
    }

    var flipDate = htmlLang == "en";

    var positives = [];
    var dialyPositives = [];
    var dates = [];
    var deaths = [];
    var recovered = [];
    var activeCases = [];
    var dailyActiveCases = [];
    var prevTodayActiveCases = 0;
    var dailyICU = [];
    var dailyIMCU = [];
    var dailyICUPercent = [];
    var dailyIMCUPercent = [];
    var firstHopitalizationsValidIndex = -1;
    var prevDayTotalPositives = 0;
    var firstValidHealthcareWorkerIndex = -1;
    var prevHealthcareWorkers = 0;
    var dailyHealthcareWorkers = [];
    var dailyHealthcareWorkersPercent = [];
    var dailyTests = [];
    var firstDailyTestsValidIndex = -1;
    var dailyPositivesPercent = [];
    var cases = [];
    var dailyCases = [];
    var prevDayTotalCases = 0;
    var positiveTestsChartsMaxIndex = -1;

    data.data.forEach(function (el, index) {
        var todayPositives = el.positives;
        if (todayPositives != undefined) {
            positiveTestsChartsMaxIndex = index;
            dialyPositives.push(todayPositives);
        }

        var date = new Date(el.date);
        var day = date.getUTCDate();
        var month = (date.getUTCMonth() + 1);
        dates.push(flipDate ? month + "/" + day : day + "/" + month);

        var todayTotalDeaths = el.deaths != undefined ? el.deaths : 0;
        deaths.push(todayTotalDeaths);

        var todayTotalRecovered = el.recovered != undefined ? el.recovered : 0;
        recovered.push(todayTotalRecovered);

        if (todayPositives != undefined) {
            var todayTotalPositives = prevDayTotalPositives + todayPositives;
            positives.push(todayTotalPositives);
            prevDayTotalPositives += todayPositives;
        }

        var totalTodayCases = el.cases != undefined ? el.cases : todayTotalPositives;
        cases.push(totalTodayCases);

        var todayHealthcareWorker = Math.max(0, el.hc - prevHealthcareWorkers);
        dailyHealthcareWorkers.push(todayHealthcareWorker);
        prevHealthcareWorkers = el.hc;
        if (firstValidHealthcareWorkerIndex < 0 && el.hc != undefined) {
            firstValidHealthcareWorkerIndex = index + 1;
        }

        var todayCases = totalTodayCases - prevDayTotalCases;
        if (el.forcedNewCases != undefined) {
            todayCases = el.forcedNewCases;
        }

        todayCases = Math.max(0, todayCases);

        prevDayTotalCases = totalTodayCases;
        dailyCases.push(todayCases);

        var todayActiveCases = totalTodayCases - todayTotalDeaths - todayTotalRecovered;
        activeCases.push(todayActiveCases);

        dailyActiveCases.push(todayActiveCases - prevTodayActiveCases);
        prevTodayActiveCases = todayActiveCases;

        var todayICU = el.icu != undefined ? el.icu : 0;
        var todayIMCU = el.imcu != undefined ? el.imcu : 0;

        dailyICU.push(todayICU);
        dailyIMCU.push(todayIMCU);

        dailyICUPercent.push((todayActiveCases > 0 ? (todayICU / todayActiveCases * 100) : 0));
        dailyIMCUPercent.push((todayActiveCases > 0 ? (todayIMCU / todayActiveCases * 100) : 0));

        if (firstHopitalizationsValidIndex < 0 && (todayICU > 0 || todayIMCU > 0)) {
            firstHopitalizationsValidIndex = index;
        }

        var todayCasesHC = Math.max(todayHealthcareWorker, todayCases);
        dailyHealthcareWorkersPercent.push((todayCasesHC > 0 ? (Math.min(1, Math.max(0, todayHealthcareWorker / todayCasesHC)) * 100) : 0));

        var todayTests = el.tests;
        if (firstDailyTestsValidIndex < 0 && todayTests != undefined) {
            firstDailyTestsValidIndex = index;
        }


        dailyTests.push(todayTests != undefined ? todayTests : todayPositives);
        if (todayPositives != undefined) {
            dailyPositivesPercent.push(((todayTests > 0 ? (todayPositives / todayTests) : 0) * 100));
        }
    });

    var pointRadius = 2;
    var pointHoverRadius = 3;

    var options = createDefaultChartOptions();
    options.scales = {
        yAxes: [{
            ticks: {
                min: 1
            }
        }]
    };
    options.tooltips = {
        onlyShowForDatasetIndex: [1]
    }
    var ctx = document.getElementById('chart-active-cases');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                createMovingAverageDataset(activeCases, 2, "#0033bb88"),
                {
                    pointBackgroundColor: "#28b8d6ff",
                    backgroundColor: "#28b8d680",
                    label: lang.activeCases.other,
                    data: activeCases,
                    pointRadius: pointRadius,
                    pointHoverRadius: pointHoverRadius
                }
            ]
        },
        options: options
    });

    options = createDefaultChartOptions();
    ctx = document.getElementById('chart-total-cases');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                pointBackgroundColor: "#28b8d6ff",
                backgroundColor: "#28b8d680",
                label: lang.totalCases.other,
                data: cases,
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius
            },
            {
                pointBackgroundColor: "#0000ffff",
                backgroundColor: "#0000ff80",
                label: lang.recovered.other,
                data: recovered,
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius
            },
            {
                pointBackgroundColor: "#e54acfff",
                backgroundColor: "#e54acfff",
                label: lang.deaths.other,
                data: deaths,
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius
            }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        xAxes: [{
            stacked: true
        }]
    };
    ctx = document.getElementById('chart-daily-tests');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.slice(firstDailyTestsValidIndex, positiveTestsChartsMaxIndex + 1),
            datasets: [{
                backgroundColor: "#7732a880",
                label: lang.dailyPositives.other,
                data: dialyPositives.slice(firstDailyTestsValidIndex, positiveTestsChartsMaxIndex + 1),
            },
            {
                backgroundColor: "#ecdb3c80",
                label: lang.dailyTests.other,
                data: dailyTests.slice(firstDailyTestsValidIndex, positiveTestsChartsMaxIndex + 1),
            }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        xAxes: [{
            stacked: true
        }]
    };
    options.tooltips = {
        onlyShowForDatasetIndex: [1]
    }
    ctx = document.getElementById('chart-daily-tests-new');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.slice(firstDailyTestsValidIndex),
            datasets: [
                createMovingAverageDataset(dailyTests, 2, "#0033bb88"),
                {
                    backgroundColor: "#ecdb3c80",
                    label: lang.dailyTests.other,
                    data: dailyTests.slice(firstDailyTestsValidIndex),
                }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    ctx = document.getElementById('chart-daily-hospitalizations');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.slice(firstHopitalizationsValidIndex),
            datasets: [{
                backgroundColor: "#ff000080",
                label: lang.icu.other,
                data: dailyICU.slice(firstHopitalizationsValidIndex),
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius
            }/*,
            {
                backgroundColor: "#ecdb3c80",
                label: lang.imcu.other,
                data: dailyIMCU.slice(firstHopitalizationsValidIndex),
            }*/
            ]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.tooltips = {
        onlyShowForDatasetIndex: [1]
    }
    ctx = document.getElementById('chart-daily-cases');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                createMovingAverageDataset(dailyCases, 2, "#0033bb88"),
                {
                    backgroundColor: "#97DBEAFF",
                    label: lang.dailyCases.other,
                    data: dailyCases,
                }]
        },
        options: options
    });

    var pieToolTips = {
        callbacks: {
            title: function (tooltipItem, data) {
                return data['labels'][tooltipItem[0]['index']];
            },
            label: function (tooltipItem, data) {
                return data['datasets'][0]['data'][tooltipItem['index']];
            }
        }
    };

    var dataChartTotal = [activeCases[activeCases.length - 1], recovered[recovered.length - 1], deaths[deaths.length - 1]];
    var totalChartTotal = getTotal(dataChartTotal);
    var labelsChartTotal = [lang.activeCases.other, lang.recovered.other, lang.deaths.other];
    labelsChartTotal = labelsChartTotal.map(function (label, index) { return label + ': ' + (dataChartTotal[index] / totalChartTotal * 100).toFixed(2) + '%' });

    options = createDefaultChartOptions();
    options.scales = {
        xAxes: [{
            display: false
        }],
        yAxes: [{
            display: false
        }]
    };
    options.elements = {
        center: {
            text: lang.totalCases.other + ': ' + cases[cases.length - 1],
            color: '#36A2EB',
            fontStyle: 'Helvetica',
            sidePadding: 15
        }
    };
    options.tooltips = pieToolTips;
    ctx = document.getElementById('chart-total');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labelsChartTotal,
            datasets: [{
                data: dataChartTotal,
                backgroundColor: ["#28b8d680", "#0000ff80", "#e54acfff"]
            }]
        },
        options: options
    });

    var totalTests = getTotal(dailyTests.slice(0, positiveTestsChartsMaxIndex + 1)) + data.unreportedDailyTests;
    var totalPositives = positives.slice(0, positiveTestsChartsMaxIndex + 1)[positives.length - 1];
    var totalNegatives = totalTests - totalPositives;

    var chartTestsData = [totalPositives, totalNegatives];
    var chartTestsLabels = [lang.positives.other, lang.negatives.other];
    chartTestsLabels = chartTestsLabels.map(function (label, index) { return label + ': ' + (chartTestsData[index] / totalTests * 100).toFixed(2) + '%' });

    options = createDefaultChartOptions();
    options.scales = {
        xAxes: [{
            display: false
        }],
        yAxes: [{
            display: false
        }]
    };
    options.elements = {
        center: {
            text: lang.totalTests.other + ': ' + totalTests,
            color: '#36A2EB',
            fontStyle: 'Helvetica',
            sidePadding: 15
        }
    };
    options.tooltips = pieToolTips
    ctx = document.getElementById('chart-tests');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartTestsLabels,
            datasets: [{
                data: chartTestsData,
                backgroundColor: ["#7732a880", "#83d02a80"]
            }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        yAxes: [{
            ticks: {
                callback: function (value) {
                    return value + "%"
                }
            }
        }]
    };
    options.tooltips = {
        callbacks: {
            label: function (tooltipItem, data) {
                return data['datasets'][0]['data'][tooltipItem['index']].toFixed(2) + " %";
            }
        }
    };
    ctx = document.getElementById('chart-tests-dialy-positives');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.slice(firstDailyTestsValidIndex, positiveTestsChartsMaxIndex + 1),
            datasets: [{
                pointBackgroundColor: "#7732a8ff",
                backgroundColor: "#7732a880",
                label: lang.graphTitleDailyPositives.other,
                data: dailyPositivesPercent.slice(firstDailyTestsValidIndex, positiveTestsChartsMaxIndex + 1),
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius
            }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        xAxes: [{
            stacked: true
        }]
    };
    options.tooltips = {
        onlyShowForDatasetIndex: [1, 2]
    }
    ctx = document.getElementById('chart-healthcare-workers');
    var hcData = dailyHealthcareWorkers.slice(firstValidHealthcareWorkerIndex);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.slice(firstValidHealthcareWorkerIndex),
            datasets: [
                createMovingAverageDataset(hcData, 2, "#0033bb88"),
                {
                    backgroundColor: "#01C6B2FF",
                    label: lang.healthCareWorkerCases.other,
                    data: hcData,
                },
                {
                    backgroundColor: "#97DBEAFF",
                    label: lang.dailyCases.other,
                    data: dailyCases.slice(firstValidHealthcareWorkerIndex),
                }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        yAxes: [{
            ticks: {
                callback: function (value) {
                    return value + "%"
                }
            }
        }]
    }
    options.tooltips = {
        callbacks: {
            label: function (tooltipItem, data) {
                return data['datasets'][0]['data'][tooltipItem['index']].toFixed(2) + " %";
            }
        }
    };

    ctx = document.getElementById('chart-healthcare-workers-percent');
    var hcPercentData = dailyHealthcareWorkersPercent.slice(firstValidHealthcareWorkerIndex);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.slice(firstValidHealthcareWorkerIndex),
            datasets: [
                createMovingAverageDataset(hcPercentData, 2, "#0033bb88"),
                {
                    backgroundColor: "#01C6B2FF",
                    label: lang.graphTitleHealthcareWorkersPercent.other,
                    data: hcPercentData,
                    pointRadius: pointRadius,
                    pointHoverRadius: pointHoverRadius
                }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        yAxes: [{
            ticks: {
                callback: function (value) {
                    return value + "%"
                }
            }
        }]
    };
    options.tooltips = {
        callbacks: {
            label: function (tooltipItem, data) {
                return data['datasets'][tooltipItem.datasetIndex]['data'][tooltipItem['index']] + " %";
            }
        }
    };
    options.scales = {
        yAxes: [{
            ticks: {
                callback: function (value) {
                    return value + "%"
                }
            }
        }]
    };
    options.tooltips = {
        callbacks: {
            label: function (tooltipItem, data) {
                return data['datasets'][tooltipItem.datasetIndex]['data'][tooltipItem['index']].toFixed(2) + " %";
            }
        }
    };

    ctx = document.getElementById('chart-daily-hospitalizations-percent');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.slice(firstHopitalizationsValidIndex),
            datasets: [{
                pointBackgroundColor: "#d9554cff",
                backgroundColor: "#d9554c80",
                label: lang.icu.other,
                data: dailyICUPercent.slice(firstHopitalizationsValidIndex),
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius
            }/*,
            {
                pointBackgroundColor: "#d9554cff",
                backgroundColor: "#ecdb3c80",
                label: lang.imcu.other,
                data: dailyIMCUPercent.slice(firstHopitalizationsValidIndex),
            }*/
            ]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.tooltips = {
        onlyShowForDatasetIndex: [1]
    }
    ctx = document.getElementById('chart-daily-active-cases');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                createMovingAverageDataset(dailyActiveCases, 2, "#0033bb88"),
                {
                    pointBackgroundColor: "#28b8d6ff",
                    backgroundColor: "#28b8d680",
                    label: lang.newActiveCases.other,
                    data: dailyActiveCases,
                }]
        },
        options: options
    });

    var regionDays = Math.min(dates.length, region.data.argentina.cases.length);

    region.data.uruguay = {
        dates: dates,
        cases: cases,
        recovered: recovered,
        deaths: deaths
    };

    region.data.uruguay.color = "#72a5d5";
    region.data.argentina.color = "#0338a8";
    region.data.brazil.color = "#fee103";
    region.data.chile.color = "#cf291d";
    region.data.paraguay.color = "#029a3a";

    var countries = Object.keys(region.data);
    var activeCasesDatasets = [];
    var casesDatasets = [];
    var deathsDatasets = [];
    for (var i = 0; i < countries.length; ++i) {
        var countryName = countries[i];
        var country = region.data[countryName];
        var populationFactor = 1000000 / population[countryName];

        activeCasesDatasets.push({
            pointRadius: 0,
            pointHoverRadius: 2,
            borderWidth: 2,
            pointBackgroundColor: country.color,
            borderColor: country.color,
            label: lang[countryName].other,
            fill: false,
            data: country.cases.slice(0, regionDays).map((el, index) => Math.round((el - country.recovered[index] - country.deaths[index]) * populationFactor)),
        });

        casesDatasets.push({
            pointRadius: 0,
            pointHoverRadius: 2,
            borderWidth: 2,
            pointBackgroundColor: country.color,
            borderColor: country.color,
            label: lang[countryName].other,
            fill: false,
            data: country.cases.slice(0, regionDays).map(el => Math.round(el * populationFactor)),
        });

        deathsDatasets.push({
            pointRadius: 0,
            pointHoverRadius: 2,
            borderWidth: 2,
            pointBackgroundColor: country.color,
            borderColor: country.color,
            label: lang[countryName].other,
            fill: false,
            data: country.deaths.slice(0, regionDays).map(el => Math.round(el * populationFactor)),
        });
    }

    var regionChartsOptions = createDefaultChartOptions();
    regionChartsOptions.legend = {
        labels: {
            usePointStyle: true
        }
    };

    ctx = document.getElementById('chart-region-active-cases');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: activeCasesDatasets
        },
        options: regionChartsOptions
    });

    ctx = document.getElementById('chart-region-cases');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: casesDatasets
        },
        options: regionChartsOptions
    });

    ctx = document.getElementById('chart-region-deaths');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: deathsDatasets
        },
        options: regionChartsOptions
    });

    var menDeaths = [0, 0, 0, 0, 0];
    var womenDeaths = [0, 0, 0, 0, 0];
    var deathLabels = ["0 - 17", "18 - 44", "45 - 64", "65 - 74", "75+"];

    for (var i = 0; i < deathsData.deaths.length; ++i) {
        var death = deathsData.deaths[i];

        var age = death.age;
        var sex = death.s;

        var sexDeaths = sex === "F" ? womenDeaths : menDeaths;

        var index = -1;

        if (age <= 17) {
            index = 0;
        }
        else if (age <= 44) {
            index = 1;
        }
        else if (age <= 64) {
            index = 2;
        }
        else if (age <= 74) {
            index = 3;
        }
        else {
            index = 4;
        }

        sexDeaths[index]++;
    }

    options = createDefaultChartOptions();
    ctx = document.getElementById('chart-deaths');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: deathLabels,
            datasets: [
                {
                    backgroundColor: "#B871FAff",
                    label: lang.men.other,
                    data: menDeaths,
                },
                {
                    backgroundColor: "#FA7571ff",
                    label: lang.women.other,
                    data: womenDeaths,
                }]
        },
        options: options
    });

    options = createDefaultChartOptions();
    options.scales = {
        xAxes: [{
            display: false
        }],
        yAxes: [{
            display: false
        }]
    };
    options.elements = {
        center: {
            text: lang.totalDeaths.other + ': ' + deathsData.deaths.length,
            color: '#36A2EB',
            fontStyle: 'Helvetica',
            sidePadding: 15
        }
    };
    options.tooltips = pieToolTips;
    ctx = document.getElementById('chart-deaths-sex');

    var dataDeathsTotal = [menDeaths.reduce(function (acc, val) { return acc + val; }, 0), womenDeaths.reduce(function (acc, val) { return acc + val; }, 0)];
    var totalDeahts = getTotal(dataDeathsTotal);
    var deathLabels = [lang.men.other, lang.women.other];
    deathLabels = deathLabels.map(function (label, index) { return label + ': ' + (dataDeathsTotal[index] / totalDeahts * 100).toFixed(2) + '%' });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: deathLabels,
            datasets: [{
                data: dataDeathsTotal,
                backgroundColor: ["#B871FAff", "#FA7571ff"]
            }]
        },
        options: options
    });

    var departments = departmentsData.departments;
    var uruguayMap = document.getElementById("uruguay-map");

    var minActives = Number.MAX_SAFE_INTEGER;
    var maxActives = 0;
    for (var key in departments) {
        if (departments.hasOwnProperty(key)) {
            var actives = departments[key];
            minActives = Math.min(minActives, actives);
            maxActives = Math.max(maxActives, actives);
        }
    }

    var paths = uruguayMap.getElementsByTagName("path");
    for (var i = 0; i < paths.length; ++i) {
        (function (path) {
            var department = departments[path.getAttribute("name")];
            var activeCases = department;
            if (activeCases > 0) {
                var center = path.getAttribute("center").split(",");
                var x = center[0];
                var y = center[1];

                var svgNS = "http://www.w3.org/2000/svg";
                var newText = document.createElementNS(svgNS, "text");
                newText.setAttribute("x", x);
                newText.setAttribute("y", y);
                newText.setAttribute("font-size", "42");
                newText.setAttribute("dominant-baseline", "middle");
                newText.setAttribute("text-anchor", "middle");
                newText.setAttribute("pointer-events", "none");
                newText.setAttribute("fill", "black");
                newText.setAttribute("stroke-width", "0");
                newText.setAttribute("font-weight", "bold");

                var textNode = document.createTextNode(activeCases.toString());
                newText.appendChild(textNode);
                uruguayMap.appendChild(newText);

                path.setAttribute('style', 'fill: #40bfdb');

                var n = 0.25 + 0.75 * (activeCases - minActives) / (maxActives - minActives);
                path.setAttribute("fill-opacity", n);
            }
        })(paths[i])
    }
}
