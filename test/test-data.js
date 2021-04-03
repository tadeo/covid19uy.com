var assert = require('chai').assert;
const fs = require('fs');
const { promisify } = require('util');
const moment = require("moment");
const DATA_DIR = "assets/js/data/"
const DATE_FORMAT = "YYYY-MM-DD";
const DATE_DEFAULT_TIME = "T00:00:00";

describe('Test data', function () {

    let uruguay = null;
    let departmentsData = null;
    let uruguayDeaths = null;
    let icu = null;

    before(async function () {
        const readFile = promisify(fs.readFile);

        await Promise.all([
            readFile(DATA_DIR + "uruguay.json").then(data => {
                uruguay = JSON.parse(data.toString());
            }).catch(assert.Throw),
            readFile(DATA_DIR + "uruguayDepartments.json").then(data => {
                departmentsData = JSON.parse(data.toString());
            }).catch(assert.Throw),
            readFile(DATA_DIR + "uruguayDeaths.json").then(data => {
                uruguayDeaths = JSON.parse(data.toString());
            }).catch(assert.Throw),
            readFile(DATA_DIR + "icu.json").then(data => {
                icu = JSON.parse(data.toString());
            }).catch(assert.Throw)
        ]);
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

    it('Each row in uruguay.json should have incremental values equal or higher than the previous day', function () {
        if (uruguay.data.length > 0) {
            let prevDay = uruguay.data[0];
            for (let i = 1; i < uruguay.data.length; ++i) {
                const prevCases = prevDay.cases || 0;
                const prevRecovered = prevDay.recovered || 0;
                const prevDeaths = prevDay.deaths || 0;
                const prevHCCases = prevDay.hc || 0;
                const prevHCRecovered = prevDay.hcRecovered || 0;
                const prevHCDeaths = prevDay.hcDeaths || 0;

                const today = uruguay.data[i];
                const cases = today.cases || 0;
                const recovered = today.recovered || 0;
                const deaths = today.deaths || 0;
                const hcCases = today.hc || 0;
                const hcRecovered = today.hcRecovered || 0;
                const hcDeaths = today.hcDeaths || 0;

                assert.isAtLeast(cases, prevCases, "Cases: " + today.date);
                if (today.date != "2020-06-21") { // Allow SINAE report error
                    assert.isAtLeast(recovered, prevRecovered, "Recovered: " + today.date);
                }
                assert.isAtLeast(deaths, prevDeaths, "Deaths: " + today.date);
                if (today.date != "2020-08-18") { // Allow SINAE report error
                    assert.isAtLeast(hcCases, prevHCCases, "HC Cases: " + today.date);
                }
                if (today.date != "2020-05-20") { // Allow SINAE report error
                    assert.isAtLeast(hcRecovered, prevHCRecovered, "HC Recovered: " + today.date);
                }
                assert.isAtLeast(hcDeaths, prevHCDeaths, "HC Deaths: " + today.date);

                prevDay = today;
            }
        }
    });

    it('The date in uruguayDeparments.json should match the last date in uruguay.json', function () {
        const today = uruguay.data[uruguay.data.length - 1];
        const todayDate = new Date(today.date + DATE_DEFAULT_TIME);
        const deparmentsDate = new Date(departmentsData.date + DATE_DEFAULT_TIME);
        assert.ok(todayDate.getTime() == deparmentsDate.getTime(), "The date in uruguayDeparments.json doen't match the last date in uruguay.json");
    });

    it('Total departments active cases in uruguayDepartments.json should match today active cases in uruguay.json', function () {
        var today = uruguay.data[uruguay.data.length - 1];
        var todayActiveCases = today.activeCases != undefined ? today.activeCases : (today.cases - today.recovered - today.deaths);

        var totalDepartmentsActiveCases = 0;
        for (var departmentKey in departmentsData.departments) {
            var department = departmentsData.departments[departmentKey];
            var departmentActiveCases = department;
            totalDepartmentsActiveCases += departmentActiveCases;
        }

        assert.equal(todayActiveCases, totalDepartmentsActiveCases, "Total departments active cases don't match Uruguay active cases");
    });

    it('Test uruguayDeaths.json data', function () {
        let prevDate = null;
        for (let i = 0; i < uruguayDeaths.deaths.length; ++i) {
            const death = uruguayDeaths.deaths[i];
            assert.isDefined(departmentsData.departments[death.dep], "Department " + death.dep + " doesn't exist in uruguayDepartments.json");
            assert.isNumber(death.age, "Death of " + death.date + " doesn't have a valid age: " + death.age);
            assert.isTrue(death.s === "F" || death.s === "M" || death.s === "?", "Death of " + death.date + " doesn't have a valid sex (F, M or ?): " + death.s);
            const date = new Date(death.date + DATE_DEFAULT_TIME);
            assert(prevDate == null || date.getTime() >= prevDate.getTime(), "Death dates must be successive");
            prevDate = date;
        }
    });

    it('Uruguay deaths count for each day in uruguay.json should match the registered deaths in uruguayDeaths.json', function () {

        let totalDeaths = 0;
        let deathHistory = [];
        for (let i = 0; i < uruguayDeaths.deaths.length; ++i) {
            var death = uruguayDeaths.deaths[i];
            var date = new Date(death.date + DATE_DEFAULT_TIME);
            totalDeaths++;

            if (deathHistory.length == 0) {
                deathHistory.push({ date: date, deaths: totalDeaths });
            }
            else {
                var prev = deathHistory[deathHistory.length - 1];
                if (prev.date.getTime() == date.getTime()) {
                    prev.deaths = totalDeaths;
                }
                else {
                    // an extra death was reported on 2021-02-22, but it wasn't informed which one
                    if (date.getTime() == new Date("2021-02-22" + DATE_DEFAULT_TIME).getTime()) {
                        totalDeaths--;
                    }
                    // a death wasn't reported on 2021-03-25
                    if (date.getTime() == new Date("2021-03-25" + DATE_DEFAULT_TIME).getTime()) {
                        totalDeaths++;
                    }

                    deathHistory.push({ date: date, deaths: totalDeaths });
                }
            }
        }
        let j = 0;
        let deaths = 0;
        for (let i = 0; i < uruguay.data.length; ++i) {
            const today = uruguay.data[i];
            const todayDeaths = today.deaths || 0;
            const todayDate = new Date(today.date + DATE_DEFAULT_TIME);

            for (; j < deathHistory.length; ++j) {
                const death = deathHistory[j];
                if (death.date.getTime() > todayDate.getTime()) {
                    break;
                }
                else {
                    deaths = death.deaths;
                }
            }

            assert.equal(todayDeaths, deaths, "Death count in uruguay.json doesn't match the deaths in uruguayDeaths.json for date " + todayDate.toString());
        }
    });

    it('Test icu.json data', function () {
        let prevDate = null;
        for (let i = 0; i < icu.data.length; ++i) {
            const today = icu.data[i];
            const date = new Date(today.date + DATE_DEFAULT_TIME);
            assert(prevDate == null || date.getTime() >= prevDate.getTime(), "ICU dates must be successive");
            prevDate = date;
            assert(today.covid19 <= today.available, "COVID-19 occupation should be less or equal to the available beds.");
            assert(today.total <= today.available, "Total ICU occupation should be less or equal to the available beds.");
        }
    });

    it('The last date in icu.json should match the last date in uruguay.json', function () {
        const today = uruguay.data[uruguay.data.length - 1];
        const todayDate = new Date(today.date + DATE_DEFAULT_TIME);
        const icuToday = icu.data[icu.data.length - 1];
        const icuDate = new Date(icuToday.date + DATE_DEFAULT_TIME);
        assert.ok(todayDate.getTime() == icuDate.getTime(), "The last date in icu.json doen't match the last date in uruguay.json");
    });
});