$(document).ready(function() {

    var nb_displayed_months = 2;
    var code_classes = ['unknown', 'office', 'home', 'away'];
    var code_icons   = ['question', 'building', 'home', 'umbrella-beach'];
    var closing_days = ['2020-11-11', '2020-12-24', '2020-12-25', '2020-12-28',
                        '2020-12-29', '2020-12-30', '2020-12-31']


    // ============================
    // DEFINTION OF NAMED FUNCTIONS
    // ============================

    // [Click event handler]
    // UPDATES THE VALUE (=INCREMENTS) OF A GIVEN CELL AND SAVES IT INTO THE DATABASE
    incrementCellCode = function(event) {
        cell = event.data.cell;
        if (cell.hasClass('pending')) {
            return;
        }
        cell.addClass('pending');
        var code_class = cell.attr('class').match(/code-([a-z]+)/)[1];
        var old_code = code_classes.indexOf(code_class) ;
        var new_code = (old_code + 1) % 4 ;
        var cell_id = cell.attr('id').substr(5);
        var cell_xy = cell.attr('id').match(/cell_([0-9]+-[0-9]+-[0-9]+)_([0-9]+)/);
        $.post('app.php', {'code': new_code, 'date':cell_xy[1], 'user':cell_xy[2]}, function(res) {
            if (res.status == 200) {
                updateCellDisplay(cell_id, new_code);
            }
            else {
                flash_ajax_error(res);
            }
            cell.removeClass('pending');
        });
    }

    // [Click event handler]
    // SHOWS ONLY A SUBSET OF ROWS IN THE SCHEDULES
    selectRows = function(event) {
        var user_ids = event.data.user_ids;
        if (user_ids.length == 0) {
            $('tr').show();
        }
        else {
            $('tr').map(function(index, elt) {
                var user_id = elt.id.match('_([0-9]+)$')[1];
                if (user_ids.includes(user_id)) {
                    $(elt).show();
                }
                else {
                    $(elt).hide();
                }
            });
        };
    }

    // UPDATES THE DISPLAY OF A GIVEN CELL TO MATCH A GIVEN CODE
    updateCellDisplay = function(cell_id, code) {
        // updates the <td> class name
        $("#cell_"+cell_id).attr('class', function(i, c) {
                return c.replace(/code-[a-z]+/, 'code-'+code_classes[code]);
            });

        // updates the <i> class name (font-awesome)
        $("#icon_"+cell_id).attr('class', function(i, c) {
                return c.replace(/fa-[-a-z]+/, 'fa-'+code_icons[code]);
            });
    }

    // CONVERTS A Date OBJECT INTO A STRING WITH "yyyy-m-d" FORMAT
    formatDateForSQL = function(date) {
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    }

    // FLASHES AN ERROR MESSAGE AFTER A FAILED AJAX REQUEST
    flash_ajax_error = function(res) {
        var alert_html = '<div class="alert alert-danger alert-dismissible fade show" role="alert">'
                       +   '<p><strong>Une erreur est survenue !</strong></p>'
                       +   '<p class="error_msg"></p>'
                       +   '<p>Rechargez la page et contactez le webmaster si le problème persiste.</p>'
                       +   '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                       +     '<span aria-hidden="true">&times;</span>'
                       +   '</button>'
                       + '</div>';

        var alert = $(alert_html);
        alert.insertBefore($('.jumbotron'));
        $('.error_msg', alert).html(res.error + ' (code ' + res.status + ')');
        alert.slideDown();
        alert.alert();
        console.log(res);
    }


    // ===================
    // PAGE INITIALIZATION
    // ===================

    // POPULATES THE LIST OF GROUPS (IN THE COLLAPSED MENU)
    $.get("app.php?type=groups", function(res) {
        if (res.status == 200) {
            $.each(res.data, function(group_name, user_ids) {
                var li = $('<li class="text-white">'+group_name+'</li>');
                li.click({'user_ids': user_ids}, selectRows);
                $('#groups').append(li);
            });

            // Add a button to show ALL the users
            // (implementation choice => user_ids is an empty array)
            $('#groups li:first-child').click({'user_ids': []}, selectRows);
        }
        else {
            flash_ajax_error(res);
        }
    });


    // CREATE ONE SCHEDULE TABLE FOR EACH MONTH
    // (with one row per user)
    var today = new Date();
    var totals = [];

    $('.schedule').hide();

    $.get("app.php?type=users", function(res) {
        if (res.status == 200) {

            var users = res.data;
            var day_names = ['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'];
            var month_names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

            // iterating through schedules...
            for (var k=0 ; k<nb_displayed_months ; k++) {
                var firstDay = new Date(today.getFullYear(), today.getMonth()+k, 1);    // first day of the schedule [Date object]
                var year = firstDay.getFullYear();                                      // year of the schedule [integer]
                var month = firstDay.getMonth()+1;                                      // month of the schedule [integer]
                var dow = firstDay.getDay();                                            // day-of-week of the first day of the schedule [integer]
                var lastDay = new Date(today.getFullYear(), (month-1)+1, 0);            // last day of the schedule [Date object]
                var daysInMonth = lastDay.getDate();                                    // number of days in the schedule [integer]

                // DOM objects for the title and the table
                var h1 = $('<h1>'+month_names[month-1]+' '+year+'</h1>');
                var div = $('<div class="schedule_container"></div>');     // container used for horizontal scrolling on small screens
                var table = $('<table class="table table-hover">');
                div.append(table);

                // iterating through rows of the k-th schedule...
                for (var i=0 ; i<=users.length ; i++) {

                    // DOM object for the table row (first row is the header)
                    if (i == 0) {
                        var trow = $('<th>');
                        trow.append($('<td class="column_users">&nbsp;</td>'));
                    }
                    else {
                        var user = users[i-1];
                        var trow = $('<tr id="row_'+year+'-'+month+'_'+user['id']+'">');
                        trow.append($('<td class="column_users">'+user['name']+'</td>'));
                    }

                    // iterating through columns of the k-th schedule...
                    var old_dow2 = 99;
                    for (var j=1 ; j<=daysInMonth ; j++) {
                        var dow2 = (dow+j-1) % 7;
                        var date_str = year+'-'+month+'-'+j;
                        if (dow2 > 0 && dow2 <6 && !closing_days.includes(date_str)) {
                            if (td && old_dow2 > dow2) {
                                // required when the last day of the previous week is in the middle of the week
                                td.addClass('column_ldow');
                            }
                            old_dow2 = dow2;

                            var td = $('<td class="column"></td>');

                            // setting cell ID attribute and contents
                            if (i == 0) {
                                td.attr('id', 'header_'+date_str);
                                td.html(day_names[dow2]+'</br>'+j);
                            }
                            else {
                                var cell_id = date_str+'_'+user['id'];
                                td.attr('id', 'cell_'+cell_id);
                                var icon = $('<i id="icon_'+cell_id+'" class="fas"></i>');

                                td.addClass('code-'+code_classes[0]);
                                icon.addClass('fa-'+code_icons[0]);

                                td.click({'cell': td}, incrementCellCode);

                                td.append(icon);
                            }

                            // adding some class names for cell styling
                            if (j == 1 || dow2 == 1) {
                                td.addClass('column_fdow');
                            }
                            if (j == daysInMonth || dow2 == 5) {
                                td.addClass('column_ldow');
                            }
                            if (j == today.getDate() && month == today.getMonth()+1 && year == today.getFullYear()) {
                                td.addClass('column_today');
                            }

                            trow.append(td);
                        }
                    }

                    // required when the last day of the month is in the middle of the week
                    td.addClass('column_ldow');

                    // appending the row to the schedule
                    table.append(trow);
                }

                // updating the page
                $('#schedule_month'+k).append(h1);
                $('#schedule_month'+k).append(div);
            }

            // UPDATES THE SCHEDULE CELLS ACCORDING TO THE DATABASE STATE
            var date1 = formatDateForSQL(new Date(today.getFullYear(), today.getMonth(), 1));
            var date2 = formatDateForSQL(new Date(today.getFullYear(), today.getMonth() + nb_displayed_months, 0));

            $.get("app.php?type=planning&from="+date1+"&to="+date2, function(res) {
                if (res.status == 200) {
                    $.each(res.data, function(index, planning) {
                        var cell_id = planning['date']+'_'+planning['user_id'];
                        var code = planning['code'];
                        updateCellDisplay(cell_id, code);
                    });

                    // ==========================================================
                    // FINALLY, NOW THAT EVERYTHING IS LOADED, SHOW THE SCHEDULES
                    $('.schedule').slideDown();
                    // ==========================================================
                }
                else {
                    flash_ajax_error(res);
                }
            });

        }
        else {
            flash_ajax_error(res);
        }

    });

});
