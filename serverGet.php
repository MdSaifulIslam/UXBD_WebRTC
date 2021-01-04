<?php

if (!isset($_GET['name'])) {
    die('no identifier');
}

$name = $_GET['name'];
if (strlen($name) == 0) {
    die('not a correct identifier');
}


$db = mysqli_connect('mysql2011.db.sakura.ne.jp', 'uxd-external', 'UltraX2020', 'uxd-external_2020');



header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended


$sql = "SELECT  user, type, data FROM room where user NOT IN ( '$name' )";
$result = $db->query($sql);

if (mysqli_num_rows($result) > 0) {

    $deleteSQL = "DELETE FROM room WHERE user NOT IN ( '$name' )";

    $db->query($deleteSQL);
}

$emparray = array();
while ($row = mysqli_fetch_assoc($result)) {
    // $emparray[] = $row;
    $temp = json_encode($row);

    echo "data:  {$temp}\n\n";
}

sleep(1);


echo 'retry: 500', PHP_EOL, PHP_EOL; // shorten the 3 seconds to 1 sec
