var OPTIONS = {

    // List of closing days (in YYYY-MM-DD format)
    closing_days: ["2020-11-11",
                   "2020-12-24", "2020-12-25", "2020-12-28", "2020-12-29", "2020-12-30", "2020-12-31"],

    // number of monthly schedules to be displayed (starting from the current month)
    nb_displayed_months: 2,

    // *****************************************************************
    // CODE NUMBERS
    //   0 = unknown
    //   1 = working on site
    //   2 = working at home
    //   3 = not working/not available

    // DOM classes associated to each code number
    code_classes: ["unknown", "office", "home", "away"],

    // Font Awesome icons associated to each code number (without "fa-" prefix)
    code_icons: ["question", "building", "home", "umbrella-beach"],

    // Code number which will be counted and displayed in header/footer rows
    code_to_count: 1,

    // Maximum count allowed before a warning is displayed
    max_count: 12

};
