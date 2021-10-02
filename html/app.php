<?php
    http_response_code(500); // in case anything goes wrong... it will be overwritten is JSON is output properly

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'POST':
            process_POST();
            break;
        case 'GET':
            process_GET();
            break;
        default:
            return_error(405, "Unhandled HTTP method: $method");
            break;
    }


    // Returns data after a successful request, all wrapped in a JSON object
    // =====================================================================
    function return_success($data) {
        $arr = array("data" => $data);
        send_json(200, $arr);
    }


    // Returns an error message wrapped in a JSON object
    // =================================================
    function return_error($httpcode, $msg) {
        $arr = array("error" => $msg);
        send_json($httpcode, $arr);
    }


    // Prints the result array in JSON format and exits the script
    // ===========================================================
    function send_json($httpcode, $arr) {
        $t = microtime(true);
        $micro = sprintf("%06d",($t - floor($t)) * 1000000);
        $d = new DateTime( date('Y-m-d H:i:s.'.$micro, $t));
        $arr['timestamp'] = $d->format("Y-m-d H:i:s.u");

        $arr['status'] = $httpcode;

        http_response_code($httpcode);
        header("Content-type: application/json; charset=utf-8");
//         die(json_encode($arr, JSON_THROW_ON_ERROR));
        die(json_encode($arr));
    }


    // Retrieves a parameter from the HTTP request or throws an error
    // ==============================================================
    function get_request_param($arr, $key) {
        if (isset($arr[$key])) {
            return $arr[$key];
        }
        else {
            return_error(400, "Parameter '$key' is missing");
        }
    }


    // Initializes the MySQL connection to the database
    // ================================================
    function init_mysql_conn() {

        // this file defines the variables used below
        require_once('include/credentials.inc');

        // throw errors rather than just warnings
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        // create the connection and return it
        try {
            $conn = new mysqli($servername, $username, $password, $database);
            $conn->set_charset("utf8");
            return $conn;
        }
        catch (mysqli_sql_exception $e) {
            return_error(500, "Database connection failed");
        }
    }

    // ==================================================
    //                    POST method
    // ==================================================

    // INSERT OR UPDATE INFORMATION INTO THE PLANNING
    // ==============================================
    function process_POST() {
        $date = get_request_param($_POST, "date");
        $user = get_request_param($_POST, "user");
        $code = get_request_param($_POST, "code");
        $ip = $_SERVER['REMOTE_ADDR'];

        $conn = init_mysql_conn();
        $sql = "INSERT INTO planning (date, user, code, lastmodified_timestamp, lastmodified_ip) VALUES ('$date', $user, $code, SYSDATE(), '$ip') ON DUPLICATE KEY UPDATE code=$code, lastmodified_timestamp=SYSDATE(), lastmodified_ip='$ip'";
        $result = $conn->query($sql);

        if ($result) {
            $data = array('date' => $date, 'user' => $user, 'code' => $code);
            return_success($data);
        }
        else {
            return_error(500, "MySQL query failed: " . $conn->error);
        }

        $conn->close();
    }


    // ==================================================
    //                    GET method
    // ==================================================

    function process_GET() {
        $type = get_request_param($_GET, "type");

        // RETURNS PLANNING DATA BETWEEN TWO DATES
        // =======================================
        if ($type == 'planning') {
            $from = get_request_param($_GET, "from");
            $to = get_request_param($_GET, "to");

            $from_date = new DateTime($from);
            $to_date = new DateTime($to);
            $interval = $to_date->diff($from_date);
            if ($interval->days > 70) {
                return_error(413, "Interval between 'from' and 'to' is too large");
            }

            $conn = init_mysql_conn();
            $sql = "SELECT DATE_FORMAT(date, '%Y-%c-%e') AS date, user, name, code FROM planning INNER JOIN users ON planning.user=users.id WHERE date BETWEEN '$from' AND '$to' AND users.active=1 ORDER BY date, name";
            $result = $conn->query($sql);

            if ($result) {
                $data = array();
                if ($result->num_rows > 0) {
                    while($row = $result->fetch_assoc()) {
                        array_push($data, array("date"=>$row["date"], "user_id"=>$row["user"], "user_name"=>$row["name"], "code"=>$row["code"]));
                    }
                }
                return_success($data);
            }
            else {
                return_error(500, "MySQL query failed: " . $conn->error);
            }

            $conn->close();
        }

        // RETURNS THE LIST OF REGISTERED USERS
        // ====================================
        elseif ($type == 'users') {
            $sql = "SELECT id, name FROM users WHERE active=1 ORDER BY name";
            $conn = init_mysql_conn();
            $result = $conn->query($sql);

            if ($result) {
                if ($result->num_rows > 0) {
                    $data = array();
                    while($row = $result->fetch_assoc()) {
                        array_push($data, array("id"=>$row["id"], "name"=>$row["name"]));
                    }
                    return_success($data);
                }
                else {
                    return_error(204, "No users found in the database");
                }
            }
            else {
                return_error(500, "MySQL query failed: " . $conn->error);
            }

            $conn->close();
        }

        // RETURNS THE LIST OF AVAILABLE GROUPS
        // ====================================
        elseif ($type == 'groups') {
            $sql = "SELECT groups.name AS group_name, groups_users.user_id FROM groups_users INNER JOIN groups ON groups_users.group_id=groups.id";
            $conn = init_mysql_conn();
            $result = $conn->query($sql);

            if ($result) {
                if ($result->num_rows > 0) {
                    $data = array();
                    while($row = $result->fetch_assoc()) {
                        $group = $row["group_name"];
                        $user = $row["user_id"];
                        if (!array_key_exists($group, $data)) {
                          $data[$group] = array();
                        }
                        array_push($data[$group], $user);
                    }
                    return_success($data);
                }
                else {
                    return_error(204, "No groups found in the database");
                }
            }
            else {
                return_error(500, "MySQL query failed: " . $conn->error);
            }

            $conn->close();
        }

        // Invalid GET request...
        else {
            return_error(400, "Unhandled GET parameter: type='$type'");
        }

    }

?>

