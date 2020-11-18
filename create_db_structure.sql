-- phpMyAdmin SQL Dump
-- version 4.6.6deb5
-- https://www.phpmyadmin.net/
--
-- Client :  localhost:3306
-- Généré le :  Mer 18 Novembre 2020 à 12:02
-- Version du serveur :  5.7.32-0ubuntu0.18.04.1
-- Version de PHP :  7.2.24-0ubuntu0.18.04.7

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

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
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `planning_date` date NOT NULL,
  `planning_user` int(11) NOT NULL,
  `old_code` int(11) DEFAULT NULL,
  `new_code` int(11) NOT NULL,
  `old_ip` text,
  `new_ip` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Structure de la table `planning`
--

CREATE TABLE `planning` (
  `date` date NOT NULL,
  `user` int(11) NOT NULL,
  `code` int(11) NOT NULL DEFAULT '0',
  `lastmodified_timestamp` datetime DEFAULT NULL,
  `lastmodified_ip` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Déclencheurs `planning`
--
DELIMITER $$
CREATE TRIGGER `planning_after_insert` AFTER INSERT ON `planning` FOR EACH ROW INSERT INTO log (timestamp, planning_date, planning_user, old_code, new_code, old_ip, new_ip) VALUES (NEW.lastmodified_timestamp, NEW.date, NEW.user, null, NEW.code, null, NEW.lastmodified_ip)
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `planning_after_update` AFTER UPDATE ON `planning` FOR EACH ROW INSERT INTO log (timestamp, planning_date, planning_user, old_code, new_code, old_ip, new_ip) VALUES (NEW.lastmodified_timestamp, NEW.date, NEW.user, OLD.code, NEW.code, OLD.lastmodified_ip, NEW.lastmodified_ip)
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Index pour les tables exportées
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
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT pour la table `log`
--
ALTER TABLE `log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
