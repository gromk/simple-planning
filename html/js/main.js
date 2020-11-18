$(document).ready(function() {

    // ===========================
    // DEFINTION OF EVENT HANDLERS
    // ===========================

    // Click event on a schedule cell
    cell_onClick_handler = function(event) {
        cell = event.data.cell;
        changeCellCode(cell, 1, true);
    }

    // Click event on the name of a group
    group_onClick_handler = function(event) {
        var li = $(event.target).closest("li");
        var user_ids = event.data.user_ids;
        if ("isTrigger" in event) {
            window.location.hash = $('a', li).attr("href");
            var history = false;
        }
        else {
            var history = true;
        }
        selectUserRows(li, user_ids, history);
    }

    // Handler for Ctrl+Y
    ctrlY_handler = function(event) {
        if ($history_pos == 0) return // nothing to redo

        next = $history[$history_pos-1];

        if (next.action_id == "change-cell-code") {
            var old_code = next.data.old_code;
            var new_code = next.data.new_code;
            var increment = new_code - old_code;
            var cell = next.data.cell;
            changeCellCode(cell, increment, false);
        }

        else if (next.action_id == "select-user-rows") {
            var new_li = next.data.new_li;
            new_li.triggerHandler("click");
        }

        $history_pos -= 1;
        updateHistoryButtons();
    }

    // Handler for Ctrl+Z
    ctrlZ_handler = function(event) {
        if ($history_pos > $history.length - 1) return // nothing to undo

        last = $history[$history_pos];

        if (last.action_id == "change-cell-code") {
            var old_code = last.data.old_code;
            var new_code = last.data.new_code;
            var increment = old_code - new_code;
            var cell = last.data.cell;
            changeCellCode(cell, increment, false);
        }

        else if (last.action_id == "select-user-rows") {
            var old_li = last.data.old_li;
            old_li.triggerHandler("click");
        }

        $history_pos += 1;
        updateHistoryButtons();
    }


    // =========================================
    // DEFINITION OF HISTORY-COMPLIANT FUNCTIONS
    // =========================================

    // SHOWS ONLY A SUBSET OF ROWS IN THE SCHEDULES
    selectUserRows = function(new_li, user_ids, history=false) {

        // index of the newly selected and of the previously selected groups
        var new_li = $(new_li);
        var old_li = $("#groups li.selected");

        // highlight the selected group
        old_li.removeClass("selected");
        new_li.addClass("selected");

        // show all users
        if (user_ids.length == 0) {
            $(".user-hidden").removeClass("user-hidden");
        }

        // show a restricted group of users
        else {
            // 'user-hidden' class on <tr> is for CSS styling
            // 'user-hidden' class on <td> is for not counting hidden users in function updateTotalsForThisDay
            $('tr.row_user').map(function(index, elt) {
                var user_id = elt.id.match('_([0-9]+)$')[1];
                if (user_ids.includes(user_id)) {
                    $(elt).removeClass("user-hidden");
                    $(elt).find("td").removeClass("user-hidden");
                }
                else {
                    $(elt).addClass("user-hidden");
                    $(elt).find("td").addClass("user-hidden");
                }
            });
        };

        // updates the totals
        updateTotalsForAllDates(OPTIONS.code_to_count);

        // add the action to history
        if (history) addToHistory("select-user-rows", {old_li: old_li, new_li: new_li});
    }


    // CHANGE THE CODE NUMBER OF A GIVEN CELL
    // SAVE IT INTO THE DATABASE
    // UPDATE THE SCHEDULE DISPLAY
    changeCellCode = function(cell, increment, history=false) {

        // discard the click event if the previous one is still being processed
        if (cell.hasClass('pending')) {
            return;
        }
        cell.addClass('pending');

        // retrive the current code number from the CLASS attribute and compute the new one
        var code_class = cell.attr('class').match(/code-([a-z]+)/)[1];
        var old_code = OPTIONS.code_classes.indexOf(code_class) ;
        var new_code = (old_code + increment) % 4 ;

        // retrieve the date and user from the ID attribute
        var cell_id = cell.attr('id').substr(5);
        var cell_xy = cell.attr('id').match(/cell_([0-9]+-[0-9]+-[0-9]+)_([0-9]+)/);
        var date_str = cell_xy[1];
        var user_id = cell_xy[2];

        // calls the backend API to change the code number
        $.post('app.php', {'code': new_code, 'date':date_str, 'user':user_id})
             .fail(function(jqXHR) {
                      flash_ajax_error(jqXHR.responseJSON);
                  })
             .done(function(res) {
                      if (history) addToHistory("change-cell-code", {old_code: old_code, new_code: new_code, cell: cell});  // add the action to history
                      updateCellDisplay(cell_id, new_code);     // updates the cell display (color, icon...)
                      updateTotalsForThisDay(date_str, 1);      // updates the totals in header and footer rows
                  })
             .always(function() {
                      cell.removeClass('pending');
                    });
    }


    // ==================================
    // DEFINTION OF OTHER NAMED FUNCTIONS
    // ==================================

    // HANDLE THE HISTORY OF USER ACTIONS
    var $history = [];
    var $history_pos = 0;
    addToHistory = function(action_id, data) {
        // clear the "future part" of the history before a new action is added to it
        if ($history_pos > 0) {
            $history = $history.filter(function (item, index) {
                return (index >= $history_pos);
            });
        }

        // add the new action as the first item in history and reset the current position
        $history.unshift({action_id: action_id, data: data});
        $history_pos = 0;

        // update the state of history buttons
        updateHistoryButtons();
    }

    // UPDATE THE STATUS (ENABLED OR DISABLED) OF HISTORY BUTTONS
    updateHistoryButtons = function() {
        if ($history_pos > $history.length - 1)
            $("#undo").addClass("disabled");
        else
            $("#undo").removeClass("disabled");

        if ($history_pos == 0)
            $("#redo").addClass("disabled");
        else
            $("#redo").removeClass("disabled");
    }

    // CACHE JQUERY HEAVY, REDUNDANT, UNCHANGING SELECTIONS FOR PERFORMANCE PURPOSE
    window.$jqcache = {};
    $$ = function(s) {
        if (window.$jqcache.hasOwnProperty(s)) {
            return $(window.$jqcache[s]);
        }
        var e = $(s);
        if(e.length > 0) {
            window.$jqcache[s] = e;
        }
        return e;
    }

    // UPDATE THE DISPLAY OF A GIVEN CELL TO MATCH A GIVEN CODE NUMBER
    updateCellDisplay = function(cell_id, code) {
        // update the <td> class name
        $("#cell_"+cell_id).attr('class', function(i, c) {
                return c.replace(/code-[a-z]+/, 'code-'+OPTIONS.code_classes[code]);
            });

        // update the <i> class name (font-awesome)
        $("#icon_"+cell_id).attr('class', function(i, c) {
                return c.replace(/fa-[-a-z]+/, 'fa-'+OPTIONS.code_icons[code]);
            });
    }

    // UPDATE THE COUNTS OF CELLS WITH A GIVEN CODE NUMBER
    updateTotalsForThisDay = function(date, code) {

        // jQuery selectors are used to count the cells
        var day_cells = $$("td[id^=cell_"+date+"_]");
        var count = day_cells.not(".user-hidden").filter(".code-"+OPTIONS.code_classes[code]).length;

        // update both cells in the header and the footer rows
        var result_cells = $(".cell_total_"+date);
        result_cells.html(count);

        // a warning is displayed if <count> exceeds <OPTIONS.max_count>
        if (count > OPTIONS.max_count) {
            result_cells.prepend($('<i class="fa fa-exclamation-triangle">'));
            result_cells.addClass("warning");
        }
        else {
            result_cells.find('i').remove();
            result_cells.removeClass("warning");
        }
    }
    updateTotalsForAllDates = function(code) {
        $$("td[id^=header_]").map(function(index, elt) {
            var date = elt.id.substr(7);
            updateTotalsForThisDay(date, OPTIONS.code_to_count);
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
        if (res)
            $('.error_msg', alert).html(res.error + ' (code ' + res.status + ')');
        else
            $('.error_msg', alert).html("Erreur lors de l'exécution de la requête");
        alert.slideDown();
        alert.alert();
    }


    // ===================
    // PAGE INITIALIZATION
    // ===================

    // ATTACH EVENT HANDLERS FOR NAVIGATING THROUGH HISTORY
    $(document).keydown(function(e) {
        if (e.which === 89 && e.ctrlKey) {
            ctrlY_handler(e);
        }
        else if (e.which === 90 && e.ctrlKey) {
            ctrlZ_handler(e);
        }
    });
    $("#undo").click(ctrlZ_handler);
    $("#redo").click(ctrlY_handler);
    updateHistoryButtons();


    // POPULATE THE LIST OF GROUPS (IN THE COLLAPSED MENU)
    $.get("app.php?type=groups")
        .fail(function(jqXHR) {
            flash_ajax_error(jqXHR.responseJSON);
        })
        .done(function(res) {
            $.each(res.data, function(group_name, user_ids) {
                var li = $('<li><a href="#'+encodeURIComponent(group_name)+'">'+group_name+'</a></li>');
                li.click({'user_ids': user_ids}, group_onClick_handler);
                $('#groups').append(li);
            });

            // Add a button to show ALL the users
            // (implementation choice => user_ids is an empty array)
            $('#groups li:first-child').click({'user_ids': []}, group_onClick_handler);
        });


    // CREATE ONE SCHEDULE TABLE FOR EACH MONTH
    // (with one row per user)
    var today = new Date();
    var totals = [];

    $('.schedule').hide();

    $.get("app.php?type=users")
        .fail(function(jqXHR) {
            flash_ajax_error(jqXHR.responseJSON);
        })
        .done(function(res) {
            var users = res.data;
            var day_names = ['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'];
            var month_names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

            // iterating through schedules...
            for (var k=0 ; k<OPTIONS.nb_displayed_months ; k++) {
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
                var nb_rows = users.length+3;
                for (var i=1 ; i<=nb_rows ; i++) {

                    // DOM object for the table row (first row is the header, second and last rows contain totals)
                    // + DOM object for the first column
                    if (i == 1) {
                        var trow = $('<th>');
                        trow.append($('<td class="column_users">&nbsp;</td>'));
                    }
                    else if (i == 2 || i == nb_rows) {
                        var trow = $('<tr class="row_total">');
                        trow.append($('<td class="column_users">Sur site&nbsp;&nbsp;<i class="fa fa-long-arrow-alt-right"></i></td>'));
                    }
                    else {
                        var user = users[i-3];
                        var trow = $('<tr id="row_'+year+'-'+month+'_'+user['id']+'" class="row_user">');
                        trow.append($('<td class="column_users">'+user['name']+'</td>'));
                    }

                    // iterating through columns of the k-th schedule...
                    var old_dow2 = 99;
                    for (var j=1 ; j<=daysInMonth ; j++) {
                        var dow2 = (dow+j-1) % 7;
                        var date_str = year+'-'+month+'-'+j;
                        if (dow2 > 0 && dow2 <6 && !OPTIONS.closing_days.includes(date_str)) {
                            if (td && old_dow2 > dow2) {
                                // required when the last day of the previous week is in the middle of the week
                                td.addClass('column_ldow');
                            }
                            old_dow2 = dow2;

                            var td = $('<td class="column"></td>');

                            // setting cell ID attribute and contents
                            if (i == 1) {
                                td.attr('id', 'header_'+date_str);
                                td.html(day_names[dow2]+'</br>'+j);
                            }
                            else if (i == 2 || i == nb_rows) {
                                td.attr('class', 'cell_total_'+date_str);
                            }
                            else {
                                var cell_id = date_str+'_'+user['id'];
                                td.attr('id', 'cell_'+cell_id);
                                var icon = $('<i id="icon_'+cell_id+'" class="fas"></i>');

                                td.addClass('code-'+OPTIONS.code_classes[0]);
                                icon.addClass('fa-'+OPTIONS.code_icons[0]);

                                td.click({'cell': td}, cell_onClick_handler);

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

            // UPDATE THE SCHEDULE CELLS ACCORDING TO THE DATABASE STATE
            var date1 = formatDateForSQL(new Date(today.getFullYear(), today.getMonth(), 1));
            var date2 = formatDateForSQL(new Date(today.getFullYear(), today.getMonth() + OPTIONS.nb_displayed_months, 0));

            $.get("app.php?type=planning&from="+date1+"&to="+date2)
                .fail(function(jqXHR) {
                    flash_ajax_error(jqXHR.responseJSON);
                })
                .done(function(res) {
                    $.each(res.data, function(index, planning) {
                        var cell_id = planning['date']+'_'+planning['user_id'];
                        var code = planning['code'];
                        updateCellDisplay(cell_id, code);
                    });

                    // Compute and display the number of people on the working place
                    updateTotalsForAllDates(OPTIONS.code_to_count);

                    // Display only a subset of users if a hash is present in the URL
                    var hash = window.location.hash.substr(1);
                    if (hash) $("#groups li a:contains('"+hash+"')").parent().triggerHandler("click");

                    // ==========================================================
                    // FINALLY, NOW THAT EVERYTHING IS LOADED, SHOW THE SCHEDULES
                    $('.schedule').slideDown();
                    // ==========================================================
                });

        });

});
