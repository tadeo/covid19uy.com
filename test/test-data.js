var assert = require('assert');
const fs = require('fs');
const moment = require("moment");

const DATE_FORMAT = "YYYY-MM-DD";

describe('Test data', function () {

    let uruguay = null;
    let departmentsData = null;
    let uruguayDeaths = null;

    before(function (done) {
        let rawData = fs.readFileSync("data/uruguay.json");
        uruguay = JSON.parse(rawData);
        rawData = fs.readFileSync("data/uruguayDepartments.json");
        departmentsData = JSON.parse(rawData);
        rawData = fs.readFileSync("data/uruguayDeaths.json")
        uruguayDeaths = JSON.parse(rawData);
        done();
    });

    it('Each row in uruguay.json should have a date a day after the previous one', function () {
        if (uruguay.data.length > 0) {
            let prevDate = moment(uruguay.data[0].date, DATE_FORMAT);
            for (let i = 1; i < uruguay.data.length; ++i) {
                const today = uruguay.data[i];
                const todayDate = moment(today.date, DATE_FORMAT);
                assert.equal(todayDate.diff(prevDate, 'days'), 1, "Date " + todayDate.format(DATE_FORMAT) + " isn't a day after the previous date.")
                prevDate = todayDate;
            }
        }
    });

    it('The date in uruguayDeparments.json should match the last date in uruguay.json', function () {
        const today = uruguay.data[uruguay.data.length - 1];
        const todayDate = moment(today.date, DATE_FORMAT);
        const deparmentsDate = moment(departmentsData.date, DATE_FORMAT);
        assert.ok(todayDate.isSame(deparmentsDate), "The date in uruguayDeparments.json doen't match the last date in uruguay.json");
    });

    it('Total departments active cases in uruguayDepartments.json should match today active cases in uruguay.json', function () {
        var today = uruguay.data[uruguay.data.length - 1];
        var todayActiveCases = today.cases - today.recovered - today.deaths;

        var totalDepartmentsActiveCases = 0;
        for (var departmentKey in departmentsData.departments) {
            var department = departmentsData.departments[departmentKey];
            var departmentActiveCases = department;
            totalDepartmentsActiveCases += departmentActiveCases;
        }

        assert.equal(todayActiveCases, totalDepartmentsActiveCases, "Total departments active cases don't match Uruguay active cases");
    });

    it('Uruguay deaths count for each day in uruguay.json should match the registered deaths in uruguayDeaths.json', function () {

        let totalDeaths = 0;
        let deathHistory = [];
        for (let i = 0; i < uruguayDeaths.deaths.length; ++i) {
            var death = uruguayDeaths.deaths[i];
            var date = moment(death.date, DATE_FORMAT);
            totalDeaths++;
            deathHistory.push({ date: date, deaths: totalDeaths });
        }

        for (let i = 0; i < uruguay.data.length; ++i) {
            const today = uruguay.data[i];
            const todayDeaths = today.deaths || 0;
            const todayDate = moment(today.date, DATE_FORMAT);

            let deaths = 0;
            for (let j = 0; j < deathHistory.length; ++j) {
                var death = deathHistory[j];
                if (death.date.isAfter(todayDate)) {
                    break;
                }
                else {
                    deaths = death.deaths;
                }
            }

            assert.equal(todayDeaths, deaths, "Death count in uruguay.json doesn't match the deatch in uruguayDeaths.json for date " + todayDate.format("YYYY-MM-DD"));
        }
    });
});