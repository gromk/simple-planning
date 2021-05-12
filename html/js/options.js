var OPTIONS = {

    // List of closing days (in YYYY-M-D format)
    closing_days: ["2020-11-11",
                   "2020-12-24", "2020-12-25", "2020-12-28", "2020-12-29", "2020-12-30", "2020-12-31",
                   "2021-1-1",
                   "2021-4-5",
                   "2021-5-13", "2021-5-14", "2021-5-24",
                   "2021-8-9", "2021-8-10", "2021-8-11", "2021-8-12", "2021-8-13",
                   "2021-11-12",
                   "2021-12-27", "2021-12-28", "2021-12-29", "2021-12-30"
                  ],

    // number of monthly schedules to be displayed (starting from the current month)
    nb_displayed_months: 2,

    // *****************************************************************
    // CODE NUMBERS
    //   0 = unknown
    //   1 = working on site
    //   2 = working at home
    //   3 = not working/not available

    // DOM classes associated to each code number
    code_classes: ["unknown", "office", "home", "away", "other"],

    // Font Awesome icons associated to each code number (without "fa-" prefix)
    code_icons: ["question", "building", "home", "umbrella-beach", "user-slash"],

    // Code number which will be counted and displayed in header/footer rows
    code_to_count: 1,

    // Maximum count allowed before a warning is displayed
    max_count: 12,
    uncounted_users: [12, 30]
};
