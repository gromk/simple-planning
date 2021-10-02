
<!-- PROJECT LOGO -->
<br />
<p align="center">
  <!--<a href="https://github.com/gromk/simple-planning">
    <img src="repo_logo.png" alt="Logo" width="160" height="120">
  </a>-->

  <h3 align="center">simple-planning</h3>

  <p align="center">
Manage the planning of your working team in a breeze!
<!--    <br />
    <br />
    <a href="">View Demo</a> -->
  </p>
</p>


<!-- ABOUT THE PROJECT -->
## About The Project

**simple-planning** regroups on a single web page the monthly schedules of all your teammates. You will know at a glance whether they are on site, on remote, on mission, training or vacation. Indicate your own plans in a few clicks.

**simple-planning** focuses on a few crucial features to keep it child's play. Really no need to be tech-saavy to use it. Left-click on a table cell to set its content, right-click to swap between full/half day modes, hit Ctrl-Z to revert a false move, select only a subgroup of coworkers in the drop-down menu. And that's pretty much it!

No backend is provided. Administration through Phpmyadmin is encouraged.

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

You will need to have a PHP server running along with a MySQL database.


### Installation
1. Get a local copy with ```git clone https://github.com/gromk/simple-planning```
2. Upload the contents of the **html** folder to the root of you webserver
3. Create a MySQL database
4. In Phpmyadmin (or whatever you use), create the database structure by importing **create_db_structure.sql**
5. Add a file named **credentials.inc** inside the **include** folder, containing the following lines:
```
<?php
  $servername = "localhost";
  $username = "<db_username>";
  $password = "<db_password>";
  $database = "<db_name>";
?>
```

<!-- USAGE EXAMPLES -->
## Usage

### Backend
The backend database must be filled and maintained manually (with Phpmyadmin for instance). No dedicated backend is provided.

More specifically, you will have to enter:
1. the names of your teammates in the ``users`` table (the ``active`` field is ``1`` by default, but you can set it to ``0`` if you no longer want to display the user on the frontend schedule)
2. the subgroups in the ``groups`` table (currently, underscores should be preferred to space characters)
3. the affectation of users in various groups in the ``groups_users`` table

### Frontend
The style and behavior of the frontend schedule can be customized in **js/options.js**, which contains a single JS object named ```OPTIONS```:

* ``closing_days`` (array) contains the list of all non-working days in your organization.
* ``nb_displayed_months`` (integer) defines how many month tables will be displayed on the webpage. The current month will be specially highlighted, while all the future months will appear slightly smaller.
* ``code_classes`` (array) refers to the class names affected to DOM elements with codes 0, 1, 2... Edit this list if you want to add/remove status possibilities.
* ``code_icons`` (array) associates an icon with each status defined in ``code_classes`` (must be names availaible in the Font Awesome collection).
* ``code_to_count`` (integer) indicates which status code will be summed in the *Total* row displayed in the header and footer of each schedule table. Choose ``-1`` to hide the *Total* rows.
* ``count_all_rows`` (boolean) defines the behavior of the *Total* rows whenever subgroups are selected: ``true`` leads to count every active user in the database, whereas ``false`` leads to count only those who belong to the selected subgroup.
* ``max_count`` (integer) is the maximum number of people whose status code is ``code_to_count``. Typically, it allows to limit the number of persons who are on site (flex office, sanitary restrictions...). If ``max_count`` is exceeded, a warning icon will appear next the corresponding date.
* ``uncounted_users`` (array) references the ids of users which are not to be accounted in the *Total* rows. This typically concerns the head manager, the service assistant, the security officer...

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

