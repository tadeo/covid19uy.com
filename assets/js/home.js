import data from "../../data/uruguay.json";

document.addEventListener("DOMContentLoaded", function (event) {
    main();
});

function getIncrementalValues(values) {
    var incrementalValues = [];
    var prevTotal = 0;
    for (var i = 0; i < values.length; ++i) {
        var value = values[i];
        var totalValue = value + prevTotal;
        incrementalValues.push(totalValue);
        prevTotal = totalValue;
    }
    return incrementalValues;
}

function main() {
    var dialyCases = data.map(function (el) { return el.cases });
    var dailyDeaths = data.map(function (el) { return el.deaths != undefined ? el.deaths : 0 });
    var dates = data.map(function (el) {
        var date = new Date(el.date);
        return date.getUTCDate() + "/" + (date.getUTCMonth() + 1)
    });

    var cases = getIncrementalValues(dialyCases);
    var deaths = getIncrementalValues(dailyDeaths);

    var ctx = document.getElementById('chart-total-cases');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                pointBackgroundColor: "#28b8d6ff",
                backgroundColor: "#28b8d680",
                label: 'Casos Totales',
                data: cases,
            },
            {
                pointBackgroundColor: "#e54acfff",
                backgroundColor: "#e54acfff",
                label: 'Muertes',
                data: deaths,
            }]
        },
        options: {
            animation: {
                duration: 0
            }
        }
    });

    var dailyTests = data.map(function (el) { return el.tests != undefined ? el.tests : el.cases });

    ctx = document.getElementById('chart-daily-cases');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                backgroundColor: "#83d02a80",
                label: 'Casos Diarios',
                data: dialyCases,
            },
            {
                backgroundColor: "#ecdb3c80",
                label: 'Análisis Diarios',
                data: dailyTests,
            }]
        },
        options: {
            animation: {
                duration: 0
            },
            scales: {
                xAxes: [{
                    stacked: true
                }]
            }
        }
    });

    var dailyICU = data.map(function (el) { return el.icu != undefined ? el.icu : 0 });
    var dailyIMCU = data.map(function (el) { return el.imcu != undefined ? el.imcu : 0 });
    // var dailyWard = data.map(function (el) { return el.ward != undefined ? el.ward : 0 });

    ctx = document.getElementById('chart-daily-hospitalizations');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                backgroundColor: "#ff000080",
                label: 'Cuidados intensivos',
                data: dailyICU,
            },
            {
                backgroundColor: "#ecdb3c80",
                label: 'Cuidados intermedios',
                data: dailyIMCU,
            }/*,
            {   backgroundColor: "#83d02a80",
                label: 'Sala',
                data: dailyWard,
            }*/
            ]
        },
        options: {
            animation: {
                duration: 0
            }
        }
    });
}
