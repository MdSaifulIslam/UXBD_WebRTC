<?php


$db = mysqli_connect('mysql2011.db.sakura.ne.jp', 'uxd-external', 'UltraX2020', 'uxd-external_2020');
$posted = file_get_contents('php://input');

$jsonData = json_decode($posted, true);

$temp = $jsonData['name'];
$event = $jsonData['event'];
$data = json_encode( $jsonData['data']);

if (!$db->query("INSERT INTO `room` (`id`, `user`, `type`, `data`) VALUES (NULL, '$temp', '$event', '$data');")) {
    echo ("Error description: " . $db->error);
}

$db->close();



?>
