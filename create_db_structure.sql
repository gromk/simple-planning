-- phpMyAdmin SQL Dump
-- version 4.9.5
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : mer. 02 déc. 2020 à 12:19
-- Version du serveur :  10.3.27-MariaDB
-- Version de PHP : 7.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `caje0478_cea`
--

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `CODES_REPARTITION`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `CODES_REPARTITION` (
`month` varchar(37)
,`total_answers` bigint(21)
,`unknown` varchar(31)
,`office` varchar(31)
,`home` varchar(31)
,`away` varchar(31)
);

-- --------------------------------------------------------

--
-- Structure de la table `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Structure de la table `groups_users`
--

CREATE TABLE `groups_users` (
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Structure de la table `log`
--

CREATE TABLE `log` (
  `id` int(11) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `planning_date` date NOT NULL,
  `planning_user` int(11) NOT NULL,
  `old_code` int(11) DEFAULT NULL,
  `new_code` int(11) NOT NULL,
  `old_ip` text DEFAULT NULL,
  `new_ip` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `LOG`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `LOG` (
`timestamp` timestamp
,`planning_date` date
,`name` mediumtext
,`old_code` int(11)
,`new_code` int(11)
,`old_ip` text
,`new_ip` text
);

-- --------------------------------------------------------

--
-- Structure de la table `planning`
--

CREATE TABLE `planning` (
  `date` date NOT NULL,
  `user` int(11) NOT NULL,
  `code` int(11) NOT NULL DEFAULT 0,
  `lastmodified_timestamp` datetime DEFAULT NULL,
  `lastmodified_ip` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Déclencheurs `planning`
--
DELIMITER $$
CREATE TRIGGER `planning_after_insert` AFTER INSERT ON `planning` FOR EACH ROW IF @TRIGGER_DISABLED IS NULL THEN
    INSERT INTO log (timestamp, planning_date, planning_user, old_code, new_code, old_ip, new_ip) VALUES (NEW.lastmodified_timestamp, NEW.date, NEW.user, null, NEW.code, null, NEW.lastmodified_ip);
END IF
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `planning_after_update` AFTER UPDATE ON `planning` FOR EACH ROW IF @TRIGGER_DISABLED IS NULL THEN
    INSERT INTO log (timestamp, planning_date, planning_user, old_code, new_code, old_ip, new_ip) VALUES (NEW.lastmodified_timestamp, NEW.date, NEW.user, OLD.code, NEW.code, OLD.lastmodified_ip, NEW.lastmodified_ip);
END IF
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` mediumtext NOT NULL,
  `active` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `USER_ACTIVITY_SCORE`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `USER_ACTIVITY_SCORE` (
`name` mediumtext
,`logged_actions` bigint(21)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `USER_IP_PAIRING`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `USER_IP_PAIRING` (
`user` mediumtext
,`ip` text
);

-- --------------------------------------------------------

--
-- Structure de la vue `CODES_REPARTITION`
--
DROP TABLE IF EXISTS `CODES_REPARTITION`;

CREATE ALGORITHM=UNDEFINED DEFINER=`caje0478`@`localhost` SQL SECURITY DEFINER VIEW `CODES_REPARTITION`  AS  select date_format(`planning`.`date`,'%b %Y') AS `month`,count(0) AS `total_answers`,concat(round(sum(`planning`.`code` = 0) * 100 / count(0),1),'%') AS `unknown`,concat(round(sum(`planning`.`code` = 1) * 100 / count(0),1),'%') AS `office`,concat(round(sum(`planning`.`code` = 2) * 100 / count(0),1),'%') AS `home`,concat(round(sum(`planning`.`code` = 3) * 100 / count(0),1),'%') AS `away` from `planning` group by month(`planning`.`date`) order by `planning`.`date` desc ;

-- --------------------------------------------------------

--
-- Structure de la vue `LOG`
--
DROP TABLE IF EXISTS `LOG`;

CREATE ALGORITHM=UNDEFINED DEFINER=`caje0478`@`localhost` SQL SECURITY DEFINER VIEW `LOG`  AS  select `log`.`timestamp` AS `timestamp`,`log`.`planning_date` AS `planning_date`,`users`.`name` AS `name`,`log`.`old_code` AS `old_code`,`log`.`new_code` AS `new_code`,`log`.`old_ip` AS `old_ip`,`log`.`new_ip` AS `new_ip` from (`log` join `users` on(`users`.`id` = `log`.`planning_user`)) order by `log`.`timestamp` desc ;

-- --------------------------------------------------------

--
-- Structure de la vue `USER_ACTIVITY_SCORE`
--
DROP TABLE IF EXISTS `USER_ACTIVITY_SCORE`;

CREATE ALGORITHM=UNDEFINED DEFINER=`caje0478`@`localhost` SQL SECURITY DEFINER VIEW `USER_ACTIVITY_SCORE`  AS  select `LOG`.`name` AS `name`,count(0) AS `logged_actions` from `LOG` group by `LOG`.`name` order by count(0) desc ;

-- --------------------------------------------------------

--
-- Structure de la vue `USER_IP_PAIRING`
--
DROP TABLE IF EXISTS `USER_IP_PAIRING`;

CREATE ALGORITHM=UNDEFINED DEFINER=`caje0478`@`localhost` SQL SECURITY DEFINER VIEW `USER_IP_PAIRING`  AS  select distinct `LOG`.`name` AS `user`,`LOG`.`new_ip` AS `ip` from `LOG` order by `LOG`.`name` ;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `log`
--
ALTER TABLE `log`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `planning`
--
ALTER TABLE `planning`
  ADD PRIMARY KEY (`date`,`user`) USING BTREE;

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `log`
--
ALTER TABLE `log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
