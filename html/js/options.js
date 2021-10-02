var OPTIONS = {

    // List of working days in the week (0=Sunday, 1=Monday, ..., 6=Saturday)
    working_dow: [1, 2, 3, 4, 5],

    // List of all non-working dates (in YYYY-M-D format)
    non_working_dates: [],

    // number of monthly schedules to be displayed (starting from the current month)
    nb_displayed_months: 2,

    // *****************************************************************
    // STATUS CODES
    //   0 = unknown
    //   1 = working on site
    //   2 = working at home
    //   3 = not working/not available
    //   4 = other (training, mission...)

    // DOM classes associated to each code number
    code_classes: ["unknown", "office", "home", "away", "other"],

    // Font Awesome icons associated to each code number (without "fa-" prefix)
    code_icons: ["question", "building", "home", "umbrella-beach", "user-slash"],

    // Code number which will be counted and displayed in header/footer rows
    //    => 1, 2, 3 or 4 for counting 'office', 'home', 'away' or 'other'
    //    => -1 for hiding the "total" rows
    code_to_count: 1,

    // Count *ALL* rows? (some rows are hidden when a specific group is displayed)
    count_all_rows: true,

    // Maximum count allowed before a warning is displayed
    max_count: 100,
    uncounted_users: []
};
