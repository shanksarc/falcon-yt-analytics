"""
Script to import YouTube analytics data provided by the user.
Incorporates:
1. Video lifetime metrics (views, watch_time_hours, likes, dislikes, subscribers, impressions, ctr, duration, avd)
2. Channel weekly likes history (2017 - 2026)
3. Channel lifetime KPI settings
"""

import sqlite3
import csv
import io
import os
import re
from datetime import datetime

WEEKLY_LIKES_CSV = """Date,Likes
2017-05-21,0
2017-05-28,0
2017-06-04,0
2017-06-11,0
2017-06-18,6
2017-06-25,15
2017-07-02,0
2017-07-09,0
2017-07-16,1
2017-07-23,3
2017-07-30,8
2017-08-06,0
2017-08-13,0
2017-08-20,5
2017-08-27,3
2017-09-03,2
2017-09-10,0
2017-09-17,0
2017-09-24,1
2017-10-01,1
2017-10-08,0
2017-10-15,0
2017-10-22,1
2017-10-29,1
2017-11-05,1
2017-11-12,0
2017-11-19,0
2017-11-26,3
2017-12-03,5
2017-12-10,8
2017-12-17,8
2017-12-24,2
2017-12-31,2
2018-01-07,9
2018-01-14,1
2018-01-21,7
2018-01-28,10
2018-02-04,9
2018-02-11,4
2018-02-18,1
2018-02-25,0
2018-03-04,4
2018-03-11,0
2018-03-18,3
2018-03-25,1
2018-04-01,3
2018-04-08,1
2018-04-15,10
2018-04-22,5
2018-04-29,4
2018-05-06,4
2018-05-13,7
2018-05-20,11
2018-05-27,3
2018-06-03,12
2018-06-10,4
2018-06-17,4
2018-06-24,12
2018-07-01,3
2018-07-08,14
2018-07-15,2
2018-07-22,3
2018-07-29,14
2018-08-05,0
2018-08-12,5
2018-08-19,6
2018-08-26,4
2018-09-02,0
2018-09-09,6
2018-09-16,5
2018-09-23,6
2018-09-30,6
2018-10-07,4
2018-10-14,2
2018-10-21,9
2018-10-28,9
2018-11-04,9
2018-11-11,17
2018-11-18,20
2018-11-25,14
2018-12-02,18
2018-12-09,5
2018-12-16,2
2018-12-23,18
2018-12-30,9
2019-01-06,27
2019-01-13,12
2019-01-20,10
2019-01-27,15
2019-02-03,10
2019-02-10,14
2019-02-17,19
2019-02-24,8
2019-03-03,13
2019-03-10,9
2019-03-17,2
2019-03-24,7
2019-03-31,8
2019-04-07,5
2019-04-14,5
2019-04-21,8
2019-04-28,18
2019-05-05,15
2019-05-12,11
2019-05-19,11
2019-05-26,3
2019-06-02,5
2019-06-09,23
2019-06-16,13
2019-06-23,10
2019-06-30,13
2019-07-07,9
2019-07-14,4
2019-07-21,11
2019-07-28,14
2019-08-04,6
2019-08-11,9
2019-08-18,14
2019-08-25,4
2019-09-01,7
2019-09-08,15
2019-09-15,10
2019-09-22,10
2019-09-29,11
2019-10-06,10
2019-10-13,12
2019-10-20,6
2019-10-27,17
2019-11-03,14
2019-11-10,14
2019-11-17,11
2019-11-24,8
2019-12-01,31
2019-12-08,39
2019-12-15,18
2019-12-22,12
2019-12-29,12
2020-01-05,28
2020-01-12,41
2020-01-19,26
2020-01-26,30
2020-02-02,21
2020-02-09,16
2020-02-16,19
2020-02-23,17
2020-03-01,15
2020-03-08,19
2020-03-15,14
2020-03-22,9
2020-03-29,15
2020-04-05,18
2020-04-12,12
2020-04-19,7
2020-04-26,10
2020-05-03,11
2020-05-10,17
2020-05-17,11
2020-05-24,8
2020-05-31,14
2020-06-07,18
2020-06-14,11
2020-06-21,15
2020-06-28,13
2020-07-05,8
2020-07-12,6
2020-07-19,14
2020-07-26,6
2020-08-02,7
2020-08-09,17
2020-08-16,7
2020-08-23,7
2020-08-30,5
2020-09-06,21
2020-09-13,18
2020-09-20,11
2020-09-27,12
2020-10-04,8
2020-10-11,6
2020-10-18,9
2020-10-25,4
2020-11-01,7
2020-11-08,6
2020-11-15,4
2020-11-22,2
2020-11-29,9
2020-12-06,13
2020-12-13,11
2020-12-20,7
2020-12-27,5
2021-01-03,12
2021-01-10,7
2021-01-17,19
2021-01-24,42
2021-01-31,35
2021-02-07,16
2021-02-14,9
2021-02-21,6
2021-02-28,9
2021-03-07,9
2021-03-14,7
2021-03-21,11
2021-03-28,9
2021-04-04,10
2021-04-11,7
2021-04-18,17
2021-04-25,7
2021-05-02,6
2021-05-09,36
2021-05-16,34
2021-05-23,44
2021-05-30,41
2021-06-06,37
2021-06-13,17
2021-06-20,26
2021-06-27,31
2021-07-04,18
2021-07-11,23
2021-07-18,2
2021-07-25,8
2021-08-01,3
2021-08-08,12
2021-08-15,11
2021-08-22,12
2021-08-29,12
2021-09-05,19
2021-09-12,28
2021-09-19,17
2021-09-26,25
2021-10-03,-10
2021-10-10,12
2021-10-17,17
2021-10-24,27
2021-10-31,8
2021-11-07,11
2021-11-14,13
2021-11-21,15
2021-11-28,34
2021-12-05,32
2021-12-12,16
2021-12-19,21
2021-12-26,12
2022-01-02,25
2022-01-09,33
2022-01-16,13
2022-01-23,24
2022-01-30,14
2022-02-06,15
2022-02-13,14
2022-02-20,8
2022-02-27,21
2022-03-06,10
2022-03-13,12
2022-03-20,6
2022-03-27,24
2022-04-03,18
2022-04-10,12
2022-04-17,11
2022-04-24,15
2022-05-01,24
2022-05-08,29
2022-05-15,24
2022-05-22,12
2022-05-29,14
2022-06-05,0
2022-06-12,23
2022-06-19,21
2022-06-26,18
2022-07-03,41
2022-07-10,39
2022-07-17,34
2022-07-24,32
2022-07-31,17
2022-08-07,12
2022-08-14,16
2022-08-21,41
2022-08-28,33
2022-09-04,20
2022-09-11,22
2022-09-18,24
2022-09-25,14
2022-10-02,19
2022-10-09,11
2022-10-16,19
2022-10-23,17
2022-10-30,15
2022-11-06,15
2022-11-13,16
2022-11-20,21
2022-11-27,50
2022-12-04,47
2022-12-11,24
2022-12-18,21
2022-12-25,43
2023-01-01,28
2023-01-08,48
2023-01-15,31
2023-01-22,16
2023-01-29,21
2023-02-05,30
2023-02-12,18
2023-02-19,23
2023-02-26,28
2023-03-05,19
2023-03-12,23
2023-03-19,35
2023-03-26,10
2023-04-02,28
2023-04-09,35
2023-04-16,17
2023-04-23,17
2023-04-30,22
2023-05-07,28
2023-05-14,20
2023-05-21,19
2023-05-28,20
2023-06-04,25
2023-06-11,24
2023-06-18,20
2023-06-25,27
2023-07-02,20
2023-07-09,19
2023-07-16,14
2023-07-23,19
2023-07-30,15
2023-08-06,12
2023-08-13,7
2023-08-20,13
2023-08-27,19
2023-09-03,17
2023-09-10,20
2023-09-17,13
2023-09-24,27
2023-10-01,21
2023-10-08,21
2023-10-15,15
2023-10-22,19
2023-10-29,35
2023-11-05,23
2023-11-12,8
2023-11-19,15
2023-11-26,20
2023-12-03,5
2023-12-10,30
2023-12-17,23
2023-12-24,12
2023-12-31,25
2024-01-07,23
2024-01-14,16
2024-01-21,13
2024-01-28,24
2024-02-04,24
2024-02-11,53
2024-02-18,30
2024-02-25,21
2024-03-03,31
2024-03-10,20
2024-03-17,40
2024-03-24,40
2024-03-31,21
2024-04-07,22
2024-04-14,11
2024-04-21,16
2024-04-28,29
2024-05-05,24
2024-05-12,16
2024-05-19,24
2024-05-26,23
2024-06-02,23
2024-06-09,22
2024-06-16,24
2024-06-23,19
2024-06-30,21
2024-07-07,22
2024-07-14,21
2024-07-21,33
2024-07-28,32
2024-08-04,34
2024-08-11,36
2024-08-18,22
2024-08-25,21
2024-09-01,28
2024-09-08,33
2024-09-15,37
2024-09-22,28
2024-09-29,25
2024-10-06,28
2024-10-13,21
2024-10-20,27
2024-10-27,11
2024-11-03,31
2024-11-10,19
2024-11-17,14
2024-11-24,14
2024-12-01,32
2024-12-08,11
2024-12-15,37
2024-12-22,17
2024-12-29,9
2025-01-05,23
2025-01-12,24
2025-01-19,28
2025-01-26,15
2025-02-02,22
2025-02-09,9
2025-02-16,22
2025-02-23,23
2025-03-02,21
2025-03-09,16
2025-03-16,24
2025-03-23,27
2025-03-30,22
2025-04-06,19
2025-04-13,22
2025-04-20,24
2025-04-27,19
2025-05-04,27
2025-05-11,19
2025-05-18,22
2025-05-25,15
2025-06-01,16
2025-06-08,14
2025-06-15,12
2025-06-22,22
2025-06-29,21
2025-07-06,15
2025-07-13,19
2025-07-20,33
2025-07-27,28
2025-08-03,29
2025-08-10,18
2025-08-17,18
2025-08-24,18
2025-08-31,17
2025-09-07,14
2025-09-14,11
2025-09-21,16
2025-09-28,12
2025-10-05,24
2025-10-12,26
2025-10-19,28
2025-10-26,29
2025-11-02,27
2025-11-09,25
2025-11-16,19
2025-11-23,14
2025-11-30,30
2025-12-07,17
2025-12-14,19
2025-12-21,34
2025-12-28,26
2026-01-04,27
2026-01-11,11
2026-01-18,13
2026-01-25,13
2026-02-01,21
2026-02-08,16
2026-02-15,15
2026-02-22,14
2026-03-01,10
2026-03-08,16
2026-03-15,14
2026-03-22,15
2026-03-29,18
2026-04-05,21
2026-04-12,14
2026-04-19,20
2026-04-26,38
2026-05-03,41
2026-05-10,15
2026-05-17,22
2026-05-24,21
2026-05-31,18
2026-06-07,20
2026-06-14,20
2026-06-21,33
2026-06-28,19
2026-07-05,20
2026-07-12,15
2026-07-19,24
2026-07-26,27
2026-08-02,15
2026-08-09,17
2026-08-16,11
2026-08-23,21
2026-08-30,22
2026-09-06,10
2026-09-13,19
2026-09-20,14
2026-09-27,15
2026-10-04,12"""

VIDEO_ANALYTICS_CSV = '''Content,Video title,Video publish time,Duration,Likes,Dislikes,New viewers,Returning viewers,Views,Watch time (hours),Subscribers,Thumbnail impressions,Thumbnail click-through rate (%)
Total,,,,7940,433,0,0,504631,42600.6525,7421,5943695,5.22
2q4TS4z4Rpk,Ultimate Guide to Acing FRM Part I 2024: Exam Insights & Strategic Study Plan,"Jan 6, 2024",2496,196,1,,,8542,927.5816,140,138912,4.02
khdD-yDWr9Y,How to register for FRM course on GARP website 2022 | FRM Course full details 2022,"Jul 13, 2022",1008,168,14,,,13782,757.9697,82,79042,11.62
DlaNGxz8dCw,Cross Currency Rate Calculation CFA Level 1 Economics | Currency Exchange Rates,"May 22, 2023",902,142,4,,,9124,551.205,79,121930,5.05
7-Rjem9jenU,HEDGING STRATEGIES USING FUTURES | FRM | CFA | 2021 Session,"Jul 19, 2018",4671,141,11,,,9635,924.9962,136,97577,6.99
G_Rh5UlbfmY,"FRM Exam Form Registration Steps, Deadlines & Key Dates 2025","Dec 20, 2024",1395,132,2,,,7212,548.9997,43,57697,8.61
fkyK5CqEgqQ,BOOKS FOR FRM PREPARATION -,"Jun 24, 2018",1870,126,9,,,8490,652.8353,97,138644,4.6
nWfzBp4RkJo,Mortgage and MBS Securities | FRM | CFA,"Apr 30, 2022",5302,117,5,,,7325,1249.7237,93,87370,5.5
hai6V9mHwiI,FRM Level 1 Previous year Question Papers 2022,"Jul 29, 2022",1019,111,9,,,10379,479.9371,100,43160,12.61
af46-aIFcS8,Probability Tree and Conditional Expectation CFA Level 1 | Quants,"Mar 14, 2024",2362,109,5,,,5877,598.6801,74,60322,6.48
EgfGa-Prlpw,Fundamentals of Probability | Part 1 |  FRM 1  Quants | May 2021,"Dec 8, 2019",3957,106,5,,,9207,733.6773,141,67160,6.26
h8QMLXemnNw,TI BA II Plus Professional Calculator Guide | FRM |  CFA,"Sep 30, 2021",3227,104,1,,,7722,766.823,63,56135,4.16
N2Q6EuaTf7g,FRM Part I Study Plan for 2023,"Jan 10, 2023",1250,104,1,,,7077,388.7983,90,84564,6.04
YFAXM2DRJGw,Measuring and Monitoring Volatility | FRM Part I | 2021,"Jun 19, 2021",4442,102,1,,,5462,855.9394,83,59361,6.09
Liyjqxi9Eo8,Arbitrage Cash and carry and Reverse Cash and Carry | FRM CFA,"Mar 7, 2024",1492,102,5,,,5731,448.1176,46,57809,5.72
3qEWb8Nj0D8,Multivariate Random variables | FRM Part I | Quants,"Oct 21, 2021",3345,101,8,,,7086,832.6717,66,66173,7.19
a3HVtfiukmI,FRM Part I Formula Revision 2022,"May 11, 2022",2933,99,3,,,4362,484.7921,36,44617,5.36
GKyYrauAJV0,COST OF CARRY MODEL | FRM PART I,"Jul 11, 2018",1546,97,10,,,9334,508.4264,68,75679,9.44
t49gcOU16eo,GARP FRM Changes 2020 Session - Explained | Subject Wise changes | Analysis,"Dec 4, 2019",2974,97,9,,,5791,554.5305,146,88112,4.04
n0PjGrB9S4A,Contango and Backwardation,"Jun 24, 2017",810,94,2,,,3555,244.1188,41,50661,4.9
mKnZYdAxGnc,Term insurance premium FRM level 1 | Financial Market and Products,"Jun 29, 2022",2426,90,1,,,4184,452.0951,41,40764,5.85
D-jNdPBycw0,Building blocks of Risk Management FRM Part I 2023 Session,"Apr 11, 2023",4886,83,2,,,4650,566.5919,86,40941,7.07
E32eJSuwnTU,Self Study Sequence FRM Part I 2020 (New Guide for 2021 Available Check Description),"Jan 14, 2020",1839,83,2,,,5593,385.5466,119,71665,4.79
tOzXmfGVnF0,Work experience submission to GARP for FRM Certification,"Jan 23, 2022",539,83,3,,,6993,383.1773,25,36491,7.98
UObaCtNM2ZI,Introduction To Derivatives | FRM Part 1 | 2026 session,"Jan 8, 2020",8016,80,5,,,6473,831.5362,96,56861,6.43
hvxiqw--JEM,FRM Part I Detailed Preparation Strategy to Pass on First Attempt 2026,"Dec 14, 2025",1818,76,3,,,4213,292.4827,30,43399,5.32
bdho8wwo6Wg,Regression Diagnostics | FRM Part I | Quants | 2021 Session,"Aug 9, 2020",2813,75,5,,,4982,570.1575,50,44233,7.71
zZHlJLQIxcE,FRM Course  in 2022 Full Details | FRM  Salary | Exam Fees  Syllabus,"Jun 1, 2021",1076,74,2,,,5577,211.4229,47,50256,5.17
6DDEhzp2UM8,Fundamentals of Probabilities | Hindi | FRM Part I 2022 | Live Demo Classes,"Dec 22, 2021",10029,71,0,,,3497,604.7233,60,33096,7.06
YQU3tiUkzYE,C02 Random Variables Part I | FRM Part I | 2020 Session,"Jan 26, 2020",3751,66,7,,,4853,693.8115,51,52366,6.41
5lSdSX_wVIU,How many questions to solve to clear FRM Exam | FRM Part I,"Jun 22, 2022",1787,65,4,,,3801,261.4553,40,39423,6.47
xCQA6vEkDqQ,Analysis of Balance Sheet Revision 2024 Session CFA Level 1 FSA,"Aug 13, 2024",1984,60,2,,,2599,206.4396,34,30838,5.35
mm62O-gA4QM,CFA Level 1 Quants Preparation Strategy 2024,"Dec 16, 2023",466,57,4,,,3280,137.8148,32,37162,7
XakzPmX-QvM,Regression All three topics Revision FRM Part I,"Mar 16, 2023",3218,57,5,,,3979,438.4688,13,32369,7.56
k7J59qLS06I,FRM Exam Changes for 2022 Session,"Dec 8, 2021",675,55,5,,,4208,165.5477,68,31623,4.86
ypP9QQGoAZk,FRM Course Part I 2022 | Sequence of Topics for self-study | Financial Risk Management,"Jan 14, 2022",625,55,1,,,2917,116.1419,68,34535,4.89
1jlSSX9oXr8,FRM GARP PRACTICE PAPERS -  HOW MANY PAPERS TO BE SOLVED,"Apr 19, 2018",390,54,2,,,4573,156.1916,67,49893,5.96
nTp4PWdKF_w,How difficult is FRM exam? | Difficulty Level of FRM Exam Part I Part II 2023,"Dec 7, 2022",1448,54,4,,,3388,295.5055,41,42772,5.46
vCq7TFuAWTM,C03 Common univariate Random Variables | FRM Part I | Quants | 2021 Session,"Jan 31, 2020",4833,53,4,,,4265,682.656,56,48554,5.59
9fn9zKWHrOw,Binomial Trees Part I - Basics | FRM | CFA | CA FINAL SFM,"Feb 10, 2019",4089,53,4,,,2889,399.9775,37,40440,5.01
cTnC8mNDYsw,Quantitative Analysis FRM Preparation Strategy FRM Part I Book 2 2023,"Dec 27, 2022",2780,52,0,,,3338,266.6035,48,42931,5.27
t8hHU6INfUk,FRM PART I Self Study Guide Video May Nov 2019,"Jan 5, 2019",1183,51,4,,,3802,219.6007,74,43599,5.32
o0TbYIm-5io,Commodity Forward Futures Pricing | FRM Part I |,"Apr 21, 2021",3519,51,1,,,2273,235.9828,22,29505,5.18
w5MEJt_QU4I,COHERENT RISK MEASURES | FRM P2 | Market Risk,"Dec 30, 2017",855,50,0,,,3091,238.7619,19,27244,7.11
Plobp7jbvUI,All you need to know about FRM Course 2023,"Dec 5, 2022",1344,50,2,,,3088,249.2412,35,50729,4.44
nZMOT-gaH6A,Most important concepts FRM Part I Quants 2022,"Aug 25, 2022",1856,49,1,,,1096,58.8941,10,15856,4.64
LsU2jwZzWpU,FRM PART I - INSURANCE - PART II - PREMIUM CALCULATION (New Video link In Description),"May 13, 2018",1805,49,12,,,3659,283.4865,47,34999,7.86
xknaptRDeEI,Value at Risk VaR Revision FRM Part I 2023,"Apr 14, 2023",2394,47,2,,,3111,327.4007,38,33695,5.17
if5-n9TSNEU,SELF STUDY GUIDE VIDEO - FRM PART I/II,"Feb 6, 2018",1301,47,2,,,4099,241.0726,84,55093,5.21
MMPLy_ZSm0w,Properties of Stock Option | FRM 1 | FMP |,"Feb 23, 2020",5049,47,5,,,3374,381.9894,25,38038,5.82
EUe7WvxRpG8,Mechanics of Futures Market : Part 1 (FRM Part1),"Jul 25, 2017",1395,47,3,,,4733,243.8711,34,37294,9.24
JzRb1cHN2V0,Forex -  Cross Currency Rate - FRM Part 1 - FMP,"Jul 31, 2017",1286,47,4,,,3543,210.7544,39,52748,4.02
AxdqlsJiShA,EXAM REVIEW - FRM PART I  MAY 18,"May 22, 2018",2015,47,4,,,4175,356.8009,56,62614,4.43
fyvImHEezX0,Sampling Moments Part 1| F1 Book 2 |,"Sep 12, 2020",2367,46,1,,,3533,515.7622,25,36780,6.53
lOdR_N755eI,FRM Part I Study Plan 2025 Most Efficient Topic Sequence,"Dec 20, 2024",657,45,2,,,2213,83.6418,32,22584,5.26
HuZvbWSwuBY,Portfolio management Risk Return Revision | CFA Level 1 | 2025 2026 Session,"Sep 25, 2025",3888,45,2,,,2135,206.7861,14,17837,7.38
-HNx8nDsGuQ,Libor scandal for FRM and CFA,"Sep 14, 2021",1194,45,0,,,1557,127.6747,18,20742,4.04
K4GzbLYbH8Q,Anatomy of Financial Crisis 2008 | GARP FRM | Full Classes,"Jul 15, 2021",2656,45,0,,,2494,285.0695,16,28573,4.95
FPHcVF0vMVw,FRM Part I  | Basic Statistics | Random variables | Multivariate | Sample Moments,"Jan 9, 2022",7355,44,3,,,2771,445.6715,22,40141,4.61
PXrjHLPpjvE,Exam Review - FRM PART I MAY 2019,"Jun 14, 2019",1763,43,9,,,3169,234.8876,33,38914,5.6
UzjMAllELq0,C05 Exchanges and OTC Markets Part I | FRM P1 | FMP,"Jan 19, 2020",4729,43,5,,,3091,480.5928,29,38704,5.17
QHUnC5rPjKQ,Black Scholes Merton Model Part 1/2 | FRM | 2020 Session,"Mar 4, 2020",5804,43,5,,,3287,450.9766,24,43878,4.92
5DZozROQWxU,Option Trading Stragies   Revision   FRM PART I | CFA | CA FInal,"Nov 10, 2018",4117,43,1,,,2230,288.7455,44,23791,5.3
Z6xGRvFcIT4,FRM Part I Live Hindi Class 3 Session 1 of 2 | FMP Book 3 |Introduction to Derivatives,"May 29, 2021",9521,43,1,,,1962,333.4279,23,17323,7.38
nehEdBx1Q4A,External and Internal Rating | FRM Part I,"Jun 11, 2021",3623,43,5,,,2762,421.9163,26,33261,5.73
OgzPdL6Vonk,Spearmans Correlation and Kendall T  | FRM Part I | CFA,"Apr 9, 2022",918,43,2,,,2015,120.392,14,34102,4.08
cPB_N6O9_ug,FRM Part I 2026 Study Sequence: What to Study First and Why,"Dec 14, 2025",591,42,0,,,2778,104.6823,24,23747,7.25
jXpPqXZSv2I,Bootstrapping interest rate term structure,"Mar 27, 2022",1678,42,2,,,2901,184.4679,23,29064,4.62
6cs8Lpuk_Ko,FRM New Syllabus Changes Part I Part II | 2023 session | Changes in FRM Curriculum 2023,"Dec 1, 2022",729,41,0,,,2320,110.5536,29,23808,6.17
mRoqT7I2wHE,FRM Part I  | Fundamentals of Probability | Basic Statistics,"Jan 9, 2022",8984,41,3,,,2211,307.807,17,34820,4.35
FBM9-osQO6w,FRM Part I Live Hindi Class 2 Session 2 of 2 | Quants | Common Univariate | Hypothesis Testing,"May 23, 2021",11405,41,2,,,2763,597.3469,15,20520,9.09
wP1VxCUFEPY,Volatility Smile : FRM Part 2,"Jul 31, 2017",2982,41,4,,,2871,339.3827,43,27085,5.35
K799ul3i0lU,FRM Part I Self Study Books Question Banks and Mock Test 2022,"Jul 27, 2022",1157,40,1,,,2080,66.7799,20,25277,4.94
1Cays51AWGU,Bernoulli Binomial and Poisson Distribution,"Jul 18, 2019",1049,40,2,,,2848,142.8766,16,36617,5.61
63x-DtUmCiE,KNOW EVERYTHING ABOUT FRM BOOKS,"Jan 27, 2018",1747,40,0,,,2034,195.8618,42,34914,3.83
mybsVxYkP2w,Introduction to FRM Class | Study Plan | FRM Part 1 | 2020 Session,"Jan 10, 2020",2183,39,0,,,1873,134.9379,39,40669,3.17
1qzEa-wT4E8,FRM Exam Review Nov 2021,"Dec 3, 2021",1021,38,0,,,2120,124.0311,20,27533,4.63
NceiiZdjBQg,Common Topics in CFA and FRM 2023,"Nov 29, 2022",630,38,1,,,1232,76.7463,9,17507,5.08
u4RCTtXkrhY,Liquidity Risk Part 1 of 2 | FRM Part II | 2020,"Jun 19, 2020",3754,38,6,,,3314,262.2718,35,36458,7.03
fauddABGnqE,Which Calculator is Good for FRM Exam | FRM | CFA | 2021,"Jun 23, 2021",507,37,3,,,2940,153.1088,43,32046,6.09
z0fFyrHyUOs,Hedging Using Futures with Questions | FRM Part I Live Hindi Class 4 Session 2 of 2 | FMP Book 3,"Jun 6, 2021",8730,36,1,,,1450,220.1448,7,17177,5.44
69gMBrFgsHQ,CFA Level 2 Exam Day Strategy Aug Nov 2025,"Aug 24, 2025",1403,36,1,,,1061,87.6646,9,20908,3.48
E53VKnqMdgA,FRM Part I Live Hindi Class 1 Session 1 of 2| Quants | Probability | Common Univariate,"May 15, 2021",9361,36,1,,,1377,156.3779,9,12251,5.74
UOwOLB7IUvw,Binomial Trees | FRM Part I Live Hindi Class,"Aug 21, 2021",8726,36,1,,,2236,462.0845,24,25160,5.71
Xjbw8a9Pbs0,FRM PART II -  C27 Credit exposure PART I 1,"Jan 9, 2019",2653,36,3,,,2097,256.5606,22,23085,6.29
mvny5yexWis,Exchange and OTC Markets| FRM Part I Live Hindi Class 3 Session 2 of 2 | FMP Book 3,"May 30, 2021",7886,36,0,,,1687,333.1562,19,16142,6.54
pelxHpg2Bys,FRM Exam fees for May 2023 session,"Nov 17, 2022",243,35,1,,,3863,92.5278,19,25904,10.99
2DdEcTlbvYQ,Time Value of Money TVM CFA Level 1 Revision 2023,"Apr 13, 2023",2004,35,0,,,1388,87.2049,9,20199,5
hYxpe-rx1gI,Best Calculators for FRM and CFA Exams: A Comprehensive Review,"Jun 13, 2023",502,34,2,,,2610,115.6346,16,41392,4.4
oNcX_h03UWk,Option Greeks Part I | FRM Part I 2023,"Sep 20, 2022",3943,34,1,,,2248,312.1453,23,24010,6.13
hh7d5nHbhDE,CFO cash flow statement indirect method | CFA Level 1 | 2023,"Jun 3, 2023",2614,33,1,,,1708,121.2241,17,29406,3.85
NNJWtGctRPo,VaR Full Revision (Part I),"Nov 3, 2018",2858,33,1,,,2637,291.4669,51,20544,5.89
j_4lgMbr5lo,FRM Part I and Part II Changes for 2024 Session,"Dec 1, 2023",1178,33,0,,,3071,141.5904,25,24835,6.22
0g97kteD54g,Quantiles Interquantile Range Median | FRM Part I | Book 2 Quants,"Feb 8, 2020",1302,32,1,,,1477,105.1804,16,28749,3.04
S_9IhXkSS2M,Derivatives Revision Forward Futures Options | FRM Part I | Shashank Wandhe,"Apr 30, 2023",12700,32,2,,,1676,253.8471,14,19854,5.56
D3hrJMK3o4U,FMP FRM Preparation Strategy Part 1 Book 3 | Falcon,"Dec 29, 2022",2143,31,0,,,1524,105.6029,20,25129,4.04
eyTGrGMONSk,How much Time required for FRM Part I Preparation May/ Nov 2023,"Nov 30, 2022",581,31,3,,,2311,115.1205,10,22906,6.98
O7ZuGuSemRk,Self Study Guide FRM Part I | 2021 Session,"Jan 27, 2021",1548,31,0,,,1636,87.5385,26,18111,4.86
wCgslaCt1i8,Binomial BSM Greeks Revision 2023 FRM Part I | By Shashank Wandhe,"Apr 27, 2023",4486,31,1,,,1469,205.9252,10,19017,4.32
sn8Wy59RBNU,How to remember BSM Formula CA | FRM | CFA Exam,"Mar 15, 2022",890,30,4,,,1515,73.9853,6,23311,3.62
ZugSvQPgSyg,BINOMIAL VS POISSON DISTRIBUTION | FRM PART I,"Aug 2, 2018",1098,30,1,,,2009,102.365,7,23925,6.15
ml1KBbKf6r4,Managing and Pricing Deposit Services | Liquidity Risk,"Feb 20, 2021",2364,29,2,,,1546,121.4771,7,16651,6.19
buz2i_lXI7w,Introduction to Financial Statements | CFA Level 1 2023 | By Shashank Wandhe,"Jun 13, 2022",5973,27,1,,,1609,73.2081,22,17524,3.64
CsJiTIsix68,PMF PDF CDF in Random Variables | FRM Part I | 2021,"Jan 26, 2020",2833,27,1,,,2184,271.1116,11,36192,3.84
P4gqXyfa-VM,Equity Valuation Basic Tools Gordon Growth DDM | CFA Level 1 2024,"Apr 30, 2024",5108,27,0,,,1170,118.674,10,24024,2.81
ysEgKpNk6GY,Corporate Bonds | FastTrack Revision | FRM Part I,"Jul 9, 2021",2496,27,5,,,1535,188.8574,9,18398,5.49
sJrxJcXau2Q,Regression  Model Misspecifications CFA Level 2 2025,"Feb 22, 2025",3001,27,1,,,1154,107.1145,11,12535,4.79
NhM07QFNi6k,Interest rate swaps | CFA Level 2 | Derivatives | 2026,"Oct 5, 2025",2248,27,3,,,1824,112.6732,13,18170,6.63
gbYWwpaQBmA,EXAM REVIEW FRM  NOV 18 EXAM,"Nov 21, 2018",1105,26,8,,,1511,112.8668,23,19243,4.36
lvMxKpQNwlM,Bond Duration Modified Duration and Effective Duration | FRM CFA CA Final,"Sep 3, 2021",1002,26,3,,,1664,96.2753,13,17902,6.38
Ukw5zjm_Ijo,Black Scholes and Merton model | FRM Part I | VRM,"Oct 29, 2019",2516,26,2,,,1435,107.2175,8,22132,4.14
R07uRG8AxVU,Should you prepare prerequisite readings of CFA Level 1 in 2024,"Dec 7, 2023",576,25,1,,,1589,53.7446,17,15053,4.48
vmQj_CfH1o0,FRM 2025 Curriculum Changes: Major Updates in Part II Market Risk & Current Issues,"Dec 1, 2024",680,24,1,,,942,40.1146,9,12843,4.66
0QQq51LUz_c,Fundamentals of Probability FRM Part I Hindi English Mix Language,"Dec 21, 2025",7461,24,0,,,1551,213.5082,20,14855,5.82
yWaK09VZXt0,Binomial Trees FRM I - REPLICATING PORTFOLIO METHOD PART 2 OF 5,"Sep 2, 2017",672,24,4,,,1874,110.1537,17,16853,4.32
XdqHhefYi5M,Introduction to FRM Class for Students | Study Plan | FRM Part 1 | 2021 Session,"Feb 4, 2021",2473,24,0,,,642,40.6995,13,17774,2.44
sqmuFNZ_3fs,FRM Part I Live Hindi Class 1 Session 2 of 2 | Quants | Probability | Common Univariate,"May 16, 2021",11036,23,1,,,1157,180.9221,5,11501,5.56
AFupvmVA1Is,EPS and Diluted EPS | CFA Level 1 2023 2023 | FSA,"Jul 6, 2023",3052,23,1,,,1283,88.0271,8,21077,4.39
Lossv6yk2-g,FRM Part I Exam Strategy for Nov 2023,"Nov 8, 2023",1053,23,1,,,777,48.8335,11,12229,3.79
4ReyYDY9HM4,Currency swaps | CFA Level 2 | Derivatives | 2026,"Oct 5, 2025",1443,23,1,,,1522,79.5537,9,15191,6.33
FFAKRc-Dp-M,FRM Part II Preparation Strategy May 2023,"Nov 23, 2022",889,23,1,,,1552,117.0162,14,22360,4.75
Ib50sSDYtJg,Pricing and Valuation of options | CFA Level 1 | Derivatives | 2026 session,"Oct 3, 2025",7058,23,1,,,1229,146.2203,14,10189,6.93
pfWgpEAIZ28,Sampling Moments Part 2 | F1Book 2,"Sep 12, 2020",2837,23,2,,,1818,303.7273,4,25191,4.19
acpJCiGGbgw,Last 2 months preparation strategy for FRM Part I Nov 2022 Exam,"Aug 24, 2022",1320,22,1,,,700,43.6632,5,13199,3.94
2m8hQYTBC7Q,GARP FRM CBT Exam | New Features | Challenges | 2021 Session,"Feb 7, 2021",1252,22,2,,,1130,65.3904,9,15563,3.93
7ASgBtw9HmI,CAPM | FRM Part I | Book 1,"Sep 26, 2020",2153,22,2,,,1506,111.5814,21,17592,5.71
FJeOWh77uVU,CFA level 1 Last 20 days strategy for exam | Aug 25 Exam | Mock Revision and Focus area strategy,"Aug 1, 2025",1850,22,1,,,876,51.3023,3,18397,3.3
R_hvDnPFtRs,Do You Need to Be a Math Expert for FRM? #frm,"Dec 21, 2025",46,22,0,,,844,4.8341,2,4676,7.16
2EjdyPFrlMY,FRM Exam Review 2020 Session | Part I | Part II,"Jan 21, 2021",2945,22,0,,,1111,81.8071,12,15599,4.26
UV-Gcjj7FoY,GREEKS  - DELTA - PART I/3 - (FRM PART I),"May 14, 2018",1992,21,2,,,1789,160.3389,20,15099,6.44
ruGjqM4ds2A,FRM Part I Quartile Guidance 2022,"Jul 5, 2022",1747,21,1,,,1240,95.1651,4,11821,6.46
l2aj7rXXydQ,Frm  With UPSC - A Success Story,"Jul 3, 2022",1690,21,0,,,665,27.6688,4,13523,2.94
FdIxLVrJySQ,CFA Level 1 Study Plan 2023 English | Shashank Wandhe | Falcon Edufin,"Feb 21, 2023",881,20,2,,,436,15.7046,6,13913,2.31
WEBQjfzdb9w,FRM P1 -FMP Properties of Stock Option   Part I,"Feb 23, 2019",2253,20,1,,,1528,127.4304,11,29049,3.68
RijGiNULfd4,FRM Part I Live Hindi Class 1 Session 1 of 2 | Quants | Common Univariate | Hypothesis Testing,"May 22, 2021",8661,20,1,,,1202,161.9656,10,12283,5.45
ByMCjrMpR64,CFA Level 1 order of preparation 2024,"Nov 9, 2023",739,20,0,,,879,36.2196,16,11113,3.75
waSTwMtk88g,Conditionally Independent Events FRM  CFA Hindi,"May 21, 2021",724,20,0,,,1039,66.189,9,24868,3.14
4EB4e9aNPZE,Fundamentals of Probability | Part 2 |  FRM 1  Quants | May 2020,"Dec 8, 2019",1906,20,1,,,1455,128.7656,7,32192,2.72
GkUpOaT8lro,Prepare Test and Get Success | Strategy for FRM Part I | Mock Test,"Jan 31, 2021",2171,19,1,,,1289,70.6153,10,17042,5.62
tzvPOzmo9m8,FRM 2026 Syllabus Changes FRM Part I | FRM Part II,"Dec 2, 2025",657,19,0,,,1500,43.8524,9,11202,5.81
jE2PbA0r3-g,Pseudo Random Number and Seed Value,"Dec 17, 2020",1906,19,1,,,874,53.9726,9,20325,3.22
hf9x0Eo882E,Most important concepts FRM Part II Quants 2022,"Sep 24, 2022",1887,18,0,,,516,20.8414,1,10484,3.62
6WKVoT8SksA,Binomial Trees Part II - Basics | FRM | CFA | CA FINAL SFM,"Feb 10, 2019",2775,18,1,,,917,108.3468,8,17714,3.06
bkgFgMxQSns,CFA Level 1 LES Questions Reality check | Nov 2023,"Nov 9, 2023",829,18,2,,,1052,45.4568,6,12970,5.27
CCH-sAdi3nY,Estimating Market Risk Measures FRM Part II 2023,"Dec 6, 2022",3509,18,0,,,1329,141.3369,13,18348,5.32
m95B21KrMyc,C05 Exchanges and OTC Markets Part 2 | FRM P1 | FMP,"Jan 19, 2020",3544,18,2,,,1235,175.3261,6,23170,3.28
YYibQa1k0Fs,Revision Strategy for FRM Part I Nov 2022 Exam | How to revise for FRM Part I exam ?,"Sep 2, 2022",831,18,0,,,536,26.5789,4,13212,2.94
jWEViAPDZh0,Exam Important Topics Book 4 Valuation and Risk Models FRM Part I  2023,"Mar 9, 2023",1435,17,1,,,1173,69.5953,5,14799,5.16
qL7OrPSkUG8,BINOMIAL TREES FRM PART 1 - TWO STEP BINOMIAL EURO OPTION PART 5B OF 5,"Sep 2, 2017",817,17,0,,,1406,69.68,13,9075,3.63
rNS4D_hduC8,CFA Level 1 Last 50 days Revision and Preparation Plan,"Sep 19, 2024",1885,17,1,,,601,34.1155,5,15341,2.5
i6kfITtzfAA,Exam Review FRM Exam Nov 2023 and MPS of FRM Exam.,"Dec 19, 2023",407,16,1,,,1054,37.8668,1,14715,4.02
8OUHkeMe4G8,Avoid These 3 Mistakes to Clear FRM in First Attempt #frm,"Dec 21, 2025",112,16,1,,,1361,8.1627,1,5087,4.4
8IX-0uBba7o,Last 20 Days Strategy | FRM Part I,"Oct 20, 2025",955,16,0,,,1035,44.8023,10,56043,0.99
0cm9pczOdjY,FRM 2019 STUDY GUIDE CHANGES,"Dec 1, 2018",910,16,2,,,2157,85.4405,22,17469,4.96
Fpl_J5nXGt0,Class 2   Probability   (PART 1),"Dec 20, 2018",2936,16,2,,,1648,104.9091,19,12910,5.03
YgpqYRDfBa8,Forward Rate Agreement | FRM | CFA | CA Final,"Feb 21, 2019",2304,15,0,,,966,81.9685,10,18523,3.13
EYh8grRFKsk,Should you defer FRM exam?,"Sep 6, 2021",513,15,2,,,998,39.0029,4,16474,4.06
JnQSTx5noIU,FRM Part I 2023 Books Release date,"Nov 30, 2022",224,15,1,,,981,19.2002,4,11805,4.76
VkEuFke4pkA,FRM Part I Hindi Classes Video classes Classroom Trainings,"Jan 12, 2023",1194,15,0,,,764,32.4479,5,14177,2.82
gTd0DbfT8Gc,Best Question Bank Study notes for FRM 2024 | Falcon Edufin | Shashank Wandhe,"Dec 27, 2023",1038,15,1,,,776,29.0503,8,10713,4.56
YA-IuigSDLY,FRM PART I  - BAYESIAN ANALYSIS C18,"Jan 25, 2018",2152,15,3,,,1356,127.9134,20,15644,4.9
HXhp4BkshrY,Introduction to Forwards,"Jun 21, 2017",596,13,0,,,327,12.305,5,5715,2.78
koW137CcnEA,GREEKS - DELTA GAMMA - PART 2/3 - (FRM PART I),"May 15, 2018",1273,13,1,,,658,57.1496,4,8200,4.9
623W_yjKISo,Z Table Distribution Table for Probability,"May 27, 2021",1286,13,1,,,538,30.7715,1,16378,2.32
UyGRiBHwFgc,FRM P1 Quants Probability   Part 1,"Dec 5, 2017",929,13,0,,,588,40.5625,9,8610,4.08
Qiq7UIQPiJc,FRM PART II  C27 Credit exposure PART 2,"Jan 9, 2019",2627,12,0,,,948,106.8274,5,13590,4.34
zYQy7YNRFqY,Climate change and Green Swan Events | FRM Part II | 2021 Current Issue,"Sep 26, 2021",1439,12,2,,,707,68.8816,7,13209,3.65
BVYJST18Rpc,P VALUE - HYPOTHESIS TESTING | FRM | CFA,"Aug 27, 2018",791,12,0,,,801,45.3483,7,12068,4.26
OzVvW1XLdYI,Know About FRM Books,"Dec 7, 2018",1894,12,0,,,619,46.7138,6,12836,2.74
RlDtkbjWRpU,FRM 2026 New Syllabus Part I Part II,"Dec 4, 2025",53,12,1,,,1444,8.5381,2,10130,4.82
3SIsaRcr5ME,Self Study Sequence FRM Part II 2019 Session,"Jan 17, 2019",1505,12,2,,,1261,74.631,19,21686,3.35
WwkMxd_Fc9U,CREDIT RISK AND CREDIT DERIVATIVE PART I | FRM Part II | by CA Janani Gomathi,"Jan 9, 2019",1216,11,4,,,1393,63.4501,11,18832,5.72
OQg3Nc2UbzA,BINOMIAL TREES FRM PART 1 - RISK NEUTRAL MODEL ONE STEP PART 5A OF 5,"Sep 2, 2017",928,11,0,,,804,56.6969,4,8551,3.45
NX4O3NG1fqg,Central Counter party : Loss waterfall: FRM Part 2: Exam question,"May 14, 2018",689,11,0,,,701,35.7872,10,11740,3.94
sK3Y5j_kC-8,VaR Full Revision Part II,"Nov 4, 2018",3461,11,1,,,1004,143.7931,13,10619,4.69
i7HRNhwWDKc,P2B1_HistoricalsimulationVAR,"Dec 27, 2017",952,10,0,,,368,16.4175,5,6630,3.62
IidneWg4zZw,Libor Replacement FRM Part II Current Issues 2021,"Sep 19, 2021",1888,10,0,,,876,69.0363,15,13129,3.64
9EoWK9bMrrw,Checking available dates for FRM CFA Exam before registering for Exam,"Jun 1, 2025",359,10,1,,,476,11.456,0,6413,3.98
j1J4ZuYskpQ,CFA Level 1 Revision R18 Understanding income statement 2023 By Shashank Wandhe,"Mar 22, 2023",6171,10,0,,,729,59.7692,5,12579,4.05
wjsTke453lc,Probability Special Questions - FRM Part 1- Quants,"Aug 2, 2017",1444,10,1,,,1104,63.6669,19,9858,5.09
TVOTvHfqXIg,R Python Interpreted language,"Jan 28, 2021",597,9,1,,,210,6.1385,4,6775,1.74
L22VVkQPuvk,TI BA II PLUS CALCULATOR FOR FRM/CFA - PART I OF SERIES - Which one you should buy,"Feb 12, 2018",752,9,0,,,555,22.6665,3,6267,3.94
6GDYFJ03rgg,Class 4 - INTRODUCTION - OPTION FUTURE AND FORWARDS (PART II) - FRM,"Jul 11, 2018",4284,9,0,,,347,57.9125,0,10165,1.93
3CrkQE-6Blc,"C57 BASEL I, II, SOLV II   PART I BASEL I - Part I","Jun 21, 2019",2865,9,0,,,544,48.1003,8,10260,2.46
pcO-p9DwOq0,Python Introduction,"May 24, 2021",258,9,0,,,124,1.2719,-1,4893,1.76
xsQC5v83cl4,Everything you need to know about CFA Course 2024,"Nov 26, 2023",1684,9,2,,,815,23.3073,6,9769,1.38
Nwh-9lJaeZ0,"Cracking the CFA Level 1 Exam: Pattern, Tips for Success","Jun 5, 2023",615,9,0,,,756,35.4043,0,19209,3.1
0Nf509HkO7M,FSA Financial Reporting Standards | CFA Level 1 | FSA | By Shashank Wandhe,"Jun 14, 2022",2814,9,0,,,646,34.6833,9,16542,2.58
kQ8ZC7UcjN0,CFA Level 2 vs CFA Level 1 | What is the difference | 2026 session,"Oct 12, 2025",1430,8,1,,,383,28.0884,0,6702,3.09
f6cxxRuVGnk,Depreciation Amortization CFA Level 1 FSA 2023,"Dec 25, 2022",2319,8,1,,,543,33.9059,4,15358,2.45
rnhK_Qhil1A,Skewness and Kurtosis | FRM PART I,"Jul 27, 2018",2457,8,0,,,977,76.4741,9,19857,3.19
V5Mtsk1aDSE,Basic Statistics - Expected Value and Properties Simplified (FRM Part I),"Jun 9, 2018",3803,8,1,,,463,49.7003,2,6768,3.28
SI0iqi79eho,FRM PART I - TVM L0,"Jan 11, 2018",2024,8,0,,,351,35.946,8,7068,2.86
F_gvSvZ14gE,Class 3 - Level 0 Derivatives,"Dec 20, 2018",3302,8,0,,,550,89.1001,10,10325,3.38
aLQvCF2HntE,BINOMIAL TREES FRM PART 1 - HEDGE RATIO FOR REPLICATING PORTFOLIO PART 3 OF 5,"Sep 2, 2017",433,8,1,,,1084,46.3741,4,9563,3.37
G9zuJ8MjbVs,FRM Preparation Booster Nov 2019,"Oct 9, 2019",1027,8,0,,,382,18.2274,8,7172,3.17
jrVOrSQEmBc,Finding Bernie Madoff | FRM Part II | Investment Risk Management | 2021,"Sep 22, 2021",1028,7,0,,,563,35.7903,3,10107,3.06
Nt_wrDbsx1I,"Which Exam Session Should You Choose for FRM Part I:— May, August, or November?","Dec 7, 2025",769,7,0,,,423,24.1685,3,8138,2.42
9vfAJZmxMiQ,TI BA II PLUS CALCULATOR FOR FRM/CFA - PART II OF  SERIES- Understand your calculator,"Feb 12, 2018",874,7,0,,,362,20.5754,1,7113,3.12
0Fxcftf4qNs,Important Announcement for Falcon Students | FRM Part I Infinity Mock Test,"Sep 18, 2022",375,7,0,,,201,6.1408,1,6423,2.51
Yl7_TN7OK4c,Should you register in early bird or standard window for FRM Part I ?,"Dec 24, 2025",328,7,0,,,503,14.5555,6,8159,2.68
RPycuR9FDfs,FRM PART 1 - VRM - CAPITAL STRUCTURE IN BANKS UNEXPECTED LOSS QUESTION,"Oct 3, 2017",638,7,0,,,638,38.1609,5,10480,3.67
iD31kKJEySo,Intercorporate investment Part 1 Investment in financial assets -  CFA Level 2 | FSA,"Oct 2, 2025",4139,7,0,,,182,11.9993,1,5420,2.23
Mzo2JApwtdc,Measures of Leverage | CFA Level 1 2023 | Corporate Issuer,"Sep 6, 2023",2840,7,0,,,318,16.3021,1,10619,2.16
Xb9h4RZGffU,Organizing visualizing and describing data CFA Level 1 revision 2023,"Sep 24, 2023",4889,7,0,,,675,61.1604,9,11674,3.92
LFe__BeFPCY,Liquidity Adjusted VaR and Ratio  - By Shashank Wandhe,"Sep 7, 2018",1812,7,1,,,768,40.7245,12,7705,4.58
zcluuRvBZ8c,Class 7 Calculator and Excel video For Basic Statistics,"Dec 24, 2018",5053,6,0,,,184,13.4321,3,5804,1.6
_K3lJIfHQSo,QQ Plot - DO IT IN EXCEL - FRM PART II MARKET RISK - BY SHASHANK WANDHE,"Dec 5, 2018",2005,6,1,,,460,23.4675,9,9681,1.78
uaJD43Q9JX8,CA Final SFM Securities Valuation Part I,"Jun 3, 2021",3497,6,0,,,129,1.5887,1,6112,1.6
2e8t2VAomik,Cost of capital Revision CFA Level 1 2023,"Sep 24, 2023",1368,6,0,,,290,12.8383,3,8639,2.44
xrlfS4VYQAE,HOW TO MANAGE EXAM WEEK   FRM PART I  II,"Nov 11, 2018",1421,6,1,,,332,26.5061,3,8901,2.62
JhGhGjDrZfs,FRM Part 1   Introduction,"Dec 19, 2017",1403,6,0,,,501,33.3728,5,12188,2.56
YvIZtMWIePQ,GGplot for data graphs in R Programming | Programming for Finance,"Oct 12, 2021",2452,6,0,,,236,3.7127,0,8462,1.9
Ol5RJxo7PcM,Class 4 - INTRODUCTION - OPTION FUTURE AND FORWARDS (PART I) - FRM,"Dec 22, 2018",1716,5,0,,,348,34.8236,0,10899,1.93
Je_r3BgAMLg,Best Revision Strategy CFA FRM Exams,"Apr 24, 2026",693,5,0,,,240,6.9204,2,5175,2.14
y5sWSxgxyjc,BINOMIAL TREES FRM PART 1 - SYNTHERIC CALL METHOD PART 4 OF 5,"Sep 2, 2017",137,5,0,,,258,4.7469,1,4513,2.64
-5I1YnLdCC8,Falcon Edufin FRM Part I Study Package Nov 2019,"Jun 21, 2019",952,5,-1,,,406,15.3156,5,10946,2.12
WzgVqPdryv8,Binomial Trees FRM I - INTRO and BINOMIAL ASSUMPTION PART 1 OF 5,"Sep 2, 2017",263,5,0,,,817,19.534,4,6399,4.67
wJ8OX8X4QMU,Forward Rate Part I - FRM | CFA |  CA Final,"Feb 21, 2019",1942,5,2,,,253,20.5147,1,10089,1.32
b-ZvfXKcoIM,Banks | FRM Part I Book 3 | Financial Markets and Products,"Oct 4, 2026",3505,5,0,,,218,1.6151,2,914,4.05
FG5dWvaKMBE,FRM P1 Quants Probability   Part 2,"Dec 5, 2017",1346,4,0,,,220,17.46,1,4232,2.76
VTd2DNqrSrE,Basic terms in probability- hindi,"Jun 27, 2017",658,4,0,,,184,5.5402,3,3039,3.09
dXxzt3jN4FQ,FRM Part I Mentorship Video Classes Mock Test Package 2026 Session,"Dec 21, 2025",545,3,0,,,165,4.8429,2,6485,1.67
Wv52VjK1o5k,Class 1   Introduction -,"Dec 20, 2018",1322,3,0,,,253,11.7185,7,5879,2.23
Mnr3Q2aFxOM,Falcon One Pager and Revision Video for FRM Part I,"Dec 14, 2018",567,3,0,,,234,8.8926,4,6088,2.05
Q5_fNPOsgw0,FRM PART I - FMP - FOREX PARITIES AND FORWARD RATE,"Dec 10, 2017",828,3,0,,,140,6.4997,3,3942,1.12
_dGpiYDe3h0,FRM Part II Last 30 days Strategy 2025 2026 session,"Oct 12, 2025",681,3,1,,,256,12.3738,2,6645,2.54
puK_301-eus,Class 5 - C35 Futures Market,"Dec 22, 2018",3111,3,1,,,303,44.7316,5,9524,1.63
WIjhmCBb93k,“THE ART OF WRITING IDT PAPER “  By CA Yachana Mutha in association with FIRST OPINION“,"Oct 31, 2018",4352,2,0,,,80,1.008,0,4046,1.06
fiDmk4e1t94,Hypothesis Question,"Dec 9, 2017",372,2,0,,,86,2.5214,0,3016,1.43
V4Xjz0Dkm_E,PART II COURSE INTRODUCTION,"Jan 12, 2018",633,2,0,,,161,10.915,2,4322,1.69
rvxKflNprGw,HOW TO APPROACH OPERATIONAL RISK - REPARATION STRATEGY,,1885,2,0,,,28,3.7291,0,29,6.9
Txo2EuokVPM,Intercorporate investment Part 2 Investment in associates -  CFA Level 2 | FSA,"Sep 11, 2026",4611,2,0,,,126,0.8225,0,1189,1.85
PYUz0Lbel2w,SHORT SELL SHORT SQUEEZE | FRM PART I,"Jul 10, 2018",654,2,0,,,112,5.3212,0,4238,1.3
_oP_SYj_m9k,Hypothesis Testing - ( DEMO ),"Dec 9, 2017",2055,2,0,,,192,17.6141,0,3688,2.52
0xwNmAP35pI,FRM Course Introduction 2021,"Jun 1, 2021",1076,2,0,,,7,0.4464,0,0,
Dvm81TMRs7M,Triangular arbitrage | CFA Level 2 | Economics Currency Exchange Rates,"Sep 28, 2026",3732,2,0,,,115,1.4461,0,962,2.08
tyaHRgfw7u8,Session 6 Part I Options Market and Properties,,10652,1,0,,,48,5.8671,0,0,
pvXmwYtaBbI,Falcon Player and LMS Introduction. For part I/II,,620,1,0,,,146,10.8169,1,28,10.71
GC_kHGG-6q8,Properties of interest rates Live session,,5684,1,0,,,21,4.4763,0,2,50
EOtp7T_hlb8,F1B3C16  Properties of interest rate part II,,7189,1,0,,,32,6.4732,0,0,
WJkHc1oHiQ8,FRM PART I - INSURANCE - PART I - BASICS,,1478,1,0,,,19,1.6539,0,20,5
VGQfaVo5O9c,SHORT SELLING AND SHORT SQUEEZE   FRM PART I,"Dec 29, 2017",1335,1,0,,,89,3.7956,2,4428,0.81
LlkCyTMtoIw,F1B3 C16 Properties of interest rate,,8190,1,0,,,41,6.4732,0,0,
E_YHel0o5GA,Session 6 Part II Trading Strategies and Commodities,,8339,1,0,,,41,6.9809,0,0,
mxPfBf-rV7I,CAPM Part I,,9657,1,0,,,12,3.2588,0,0,
Kp1APqWRFoM,FMP C2 Part 3,,906,0,0,,,6,0.4767,0,7,0
3Ja1AhGuvKE,FMP C2 Part 2,,1392,0,0,,,8,1.2257,0,7,0
RXNMbAd79pw,FRM P2 B3 Ops Risk Introduction,,1883,0,0,,,5,0.5446,0,16,6.25
IU8l23iasfo,CAPM Part II APT,,9724,0,0,,,14,6.705,0,0,
1vLOzCH_9ns,P2B1_Coherentriskmeasure.mov,,836,0,0,,,3,0.0945,0,12,0
Lt3InZOF6fU,New LMS - FRM360.Net,,630,0,0,,,18,1.3229,0,26,0
cJFh_nWTSWo,P2B1_HistoricalsimulationVAR_2.mov,,577,0,0,,,3,0.0215,0,13,0
LlaR3OrMhAE,"📢 Early Bird Offer: Get 10% OFF on FRM Part I & II Classes! 🚀
Looking to kickstart your Financial Ri","Jun 22, 2026",16,0,0,,,186,0.0912,0,0,
hgxYVu8Zu6c,TI BA II PLUS CALCULATOR- BASIC STATISTICS FUNCTION - FOR FRM/CFA - PART II OF SERIES-,"Mar 25, 2018",998,0,0,,,235,19.2027,1,4808,3.2
aEJWtoktKtc,F1B3C06 07 Central Clearing Futures market,,9418,0,0,,,19,4.0619,0,0,
xcc_kcJj5jI,P2B1_T1_VAR approaches2.mov,,661,0,0,,,5,0.2477,0,11,0
176M_b1TZM8,Session 10 Interest Rates and Bond Yield,,7956,0,0,,,20,7.1973,0,0,
Swx-PcqWVPk,P2B1_VAR Backtesting.mov,,1727,0,0,,,3,0.0503,0,13,0
nixr86mjb3A,FMP HEDGING STRATEGIES,,4611,0,0,,,5,0.0331,0,19,5.26
lY1joOWnCc8,Review previous test results,,228,0,0,,,51,1.5246,0,25,0
iVDL5BHWD40,FMP C2 Part 1,,1925,0,0,,,6,2.6007,0,7,0
qDpzh8QjcWM,FMP C1 Part 1,,644,0,0,,,0,0,0,6,0
jCQkY_o4exk,FMP C1 Part 2,,2203,0,0,,,1,0.0014,0,7,0
kix6gAQitHk,FMP VALUATION OF FORWARD PART 2,,1006,0,0,,,1,0.0093,0,10,0
Y3NJn9ClmQk,VRM - KEY POINTS,,2355,0,0,,,3,0.5607,0,24,0
BMROObu_HG8,FMP ALL IMPORTANT POINTS YOU NEED TO COVER,,2391,0,0,,,13,1.4901,0,21,0
ac1GUEoD1pY,F1 QUANTS BASIC STAT PART 5,,568,0,0,,,5,0.4896,0,9,0
DlYYV2RrNDA,FMP VALUATION OF FORWARD PART 4,,2085,0,0,,,0,0,0,10,0
Ak-oqpoJelU,F1 QUANTS BASIC STAT PART 1,,1151,0,0,,,12,1.4883,0,7,0
2nUkNu7bAvs,FRM PART I - FMP - FOREX - BASICS AND LOGIC BEHIND CURRENCY CODES,"Dec 11, 2017",537,0,0,,,178,6.7731,2,4293,1.51
IQMFesw5UNs,Book 4 Var Session 2,,6775,0,0,,,3,0.8963,0,0,
0_SyJ_7_XV8,ScreenRecorderProject44,,1994,0,0,,,8,0.0473,0,17,0
oYpUxsYNc_s,Foreign exchange Market,,9572,0,0,,,18,6.1747,0,0,
aPJyRki7920,Swaps Live session 2021,,12940,0,0,,,36,13.553,0,0,
x2Ivd5cyBng,Forward Future Pricing,,9305,0,0,,,5,1.1836,0,0,
Ve7MS_RNdYg,F1B3 C33 MUTUAL FUND AND HEDGE FUND SHORT DISCUSSION,,2344,0,0,,,4,0.0137,0,21,0
u8Xpqe7cpnQ,EXAM DAY STRATEGY,,3121,0,0,,,11,3.2224,0,24,12.5
6n3w3HemOaE,Falcon edufin FRM SP User video,,948,0,0,,,12,1.3045,0,6,0
3jdKshhs7y4,Forward Future Pricing,,9305,0,0,,,1,0.0138,0,0,
ffnaAFYOOH0,LAST 4 DAYS STRATEGY,,513,0,0,,,8,0.6231,0,21,0
YAMG7EOmIv0,Live Session Regression Linear Excel,,9282,0,0,,,4,0.0204,0,0,
xTaGdVbNCL4,P2B1_HistoricalsimulationVAR_3.mov,,267,0,0,,,1,0.0241,0,13,0
Qi9QBWWwcUg,FMP C1 Part 4,,2288,0,0,,,0,0,0,7,0
358oexdK0zw,F1 QUANTS BASIC STAT PART 3,,1556,0,0,,,16,2.7152,0,8,0
rT-916EZjyc,Machine Learning and AI | FRM Part II | Current Issues | Class 1 |,,2457,0,0,,,2,0.1158,0,0,
hhWryK2-tyI,Greeks,,3878,0,0,,,32,6.0073,0,0,
Jpi8D939CPU,Most Important   Exam Day Video,,2717,0,0,,,101,19.3516,1,40,5
tTaiJzXPu0k,FMP C1 Part 3,,2695,0,0,,,0,0,0,7,0
QmsxJjeYB4U,FRM PART I - Forwards and futures Level zero,"Dec 19, 2017",449,0,0,,,74,2.7652,0,3049,0.82
dxocUf_W8hs,F1 QUANTS BASIC STAT PART 2,,994,0,0,,,8,1.3853,0,7,0
ayD3iTLP1XQ,FMP C2 Part 4,,1380,0,0,,,9,1.4119,0,7,0
kdKZ9hwQnow,Book 4 Var Session 1,,10043,0,0,,,7,1.5166,0,0,
CkiAX8mLcok,QUANTS - KEY TOPICS YOU NEED TO KNOW,"May 16, 2018",1452,0,0,,,8,1.309,0,24,0
DTmOvl3LH7Q,Live Session Multiple Linear Regression,,9033,0,0,,,4,0.0401,0,0,
BBdWnTAhNTY,RAROC ANSWER,,860,0,0,,,21,1.2213,0,26,3.85
LpBeum7fWvM,"🌟 *Turn Yesterday’s Challenge Into November’s Victory!* 🌟
An exam result doesn't define your capabil","Jun 28, 2026",16,0,0,,,367,0.2262,0,0,
Pjsj6djiH6s,F1B2 C29 CORRELATION AND COPULA SUMMARY,,1026,0,0,,,3,0.5822,0,21,0
z8D8meXXxVU,P2B1_ParametricVAR.mov,,559,0,0,,,3,0.1544,0,13,0
Ng02p11ovuo,P2B1_T1_VAR approaches1.mov,,490,0,0,,,10,0.1647,0,10,0
F-wbg1lvVvU,FMP VALUATION OF FORWARD PART 5,"Dec 30, 2017",1150,0,0,,,4,0.0051,0,10,0
avE4lxWrayg,FOUNDATIONS - KEY POINTS TO REVISE,,1231,0,0,,,8,0.982,0,24,0
mwj_D9eJQQE,MOST IMP Q NO 13 FOUNDATION,,536,0,0,,,12,0.9838,0,24,0
OD3upA2CAbg,Time Value of money(short discussion) Part 1,,1513,0,0,,,0,0,0,6,0
2SmV8cqa8os,F1 QUANTS BASIC STAT PART 4,,1243,0,0,,,5,1.3878,0,8,0
kKG0OkrLbWg,Binomial option pricing CA final,"Aug 2, 2022",1642,0,0,,,3,0.0437,0,0,
YGhV1y5t6pY,FMP VALUATION OF FORWARD PART 3,,720,,,,,,,,10,0
59KHrnReXa0,"FRM Part I - Basic Statistics (Random Variables, Multivariate RV, Sample moments) Combination)","May 15, 2021",0,,,,,,,,4,0
GOAc_w8hL2U,P2B1_VAR mapping_1.mov,,522,,,,,,,,14,0
vUbmH-RW4Zg,P2B1_VAR mapping_2.mov,,1392,,,,,,,,15,0'''


def parse_publish_date(date_str: str) -> str:
    if not date_str or not date_str.strip():
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    clean = date_str.strip()
    # Try parsing "Jan 6, 2024", "Jul 13, 2022", etc.
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(clean, fmt)
            return dt.strftime("%Y-%m-%d 12:00:00")
        except ValueError:
            pass
    return clean


def run_import():
    db_path = os.path.join(os.path.dirname(__file__), "falcon_yt.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Ensure columns exist on videos table
    cursor.execute("PRAGMA table_info(videos)")
    existing_cols = {r["name"] for r in cursor.fetchall()}

    new_cols = [
        ("dislikes", "INTEGER DEFAULT 0"),
        ("new_viewers", "INTEGER DEFAULT 0"),
        ("returning_viewers", "INTEGER DEFAULT 0")
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing_cols:
            print(f"Adding column {col_name} to videos...")
            cursor.execute(f"ALTER TABLE videos ADD COLUMN {col_name} {col_def}")

    # 2. Ensure channel_weekly_metrics table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS channel_weekly_metrics (
            week_date TEXT PRIMARY KEY,
            likes INTEGER NOT NULL,
            cumulative_likes INTEGER NOT NULL
        )
    """)

    # 3. Import weekly likes
    print("Importing weekly likes...")
    wl_reader = csv.reader(io.StringIO(WEEKLY_LIKES_CSV.strip()))
    header = next(wl_reader)
    weekly_rows = []
    running_likes = 0
    for row in wl_reader:
        if not row or len(row) < 2:
            continue
        w_date = row[0].strip()
        try:
            w_likes = int(row[1].strip())
        except ValueError:
            w_likes = 0
        running_likes += w_likes
        weekly_rows.append((w_date, w_likes, running_likes))

    cursor.executemany("""
        INSERT OR REPLACE INTO channel_weekly_metrics (week_date, likes, cumulative_likes)
        VALUES (?, ?, ?)
    """, weekly_rows)
    print(f"-> Imported {len(weekly_rows)} weekly likes data points (from {weekly_rows[0][0]} to {weekly_rows[-1][0]}).")

    # 4. Import video lifetime analytics
    print("Importing video lifetime analytics...")
    va_reader = csv.reader(io.StringIO(VIDEO_ANALYTICS_CSV.strip()))
    va_header = next(va_reader)

    total_row = None
    video_records = []
    
    # Try importing categorizer if available
    try:
        from categorizer import categorize_video
    except ImportError:
        def categorize_video(t, d):
            return "General Prep", "General / Strategy", "Core Lecture"

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    updated_count = 0
    inserted_count = 0

    for row in va_reader:
        if not row or len(row) < 2:
            continue
        content_id = row[0].strip()
        if content_id.lower() == 'total':
            total_row = row
            continue
        if not content_id:
            continue

        title = row[1].strip() if len(row) > 1 else ""
        pub_raw = row[2].strip() if len(row) > 2 else ""
        pub_date = parse_publish_date(pub_raw)
        
        def safe_int(v, default=0):
            try:
                return int(float(v.strip())) if v and v.strip() else default
            except ValueError:
                return default

        def safe_float(v, default=0.0):
            try:
                return float(v.strip()) if v and v.strip() else default
            except ValueError:
                return default

        duration = safe_int(row[3]) if len(row) > 3 else 0
        likes = safe_int(row[4]) if len(row) > 4 else 0
        dislikes = safe_int(row[5]) if len(row) > 5 else 0
        new_v = safe_int(row[6]) if len(row) > 6 else 0
        ret_v = safe_int(row[7]) if len(row) > 7 else 0
        views = safe_int(row[8]) if len(row) > 8 else 0
        watch_time = safe_float(row[9]) if len(row) > 9 else 0.0
        subs = safe_int(row[10]) if len(row) > 10 else 0
        impr = safe_int(row[11]) if len(row) > 11 else 0
        ctr = safe_float(row[12]) if len(row) > 12 else 0.0

        # Calculate average view duration (seconds)
        if views > 0 and watch_time > 0:
            avd = int(round((watch_time * 3600.0) / views))
        else:
            avd = 0

        # Check if video exists in videos table
        cursor.execute("SELECT id, course, topic, format, thumbnail_url, published_at FROM videos WHERE id = ?", (content_id,))
        existing = cursor.fetchone()

        if existing:
            # Update existing record
            cursor.execute("""
                UPDATE videos
                SET title = COALESCE(NULLIF(?, ''), title),
                    published_at = CASE WHEN published_at IS NULL OR published_at = '' THEN ? ELSE published_at END,
                    duration_seconds = CASE WHEN ? > 0 THEN ? ELSE duration_seconds END,
                    views = ?,
                    watch_time_hours = ?,
                    subscribers_gained = ?,
                    likes = ?,
                    dislikes = ?,
                    new_viewers = ?,
                    returning_viewers = ?,
                    impressions = ?,
                    ctr = ?,
                    avg_view_duration = ?,
                    updated_at = ?
                WHERE id = ?
            """, (
                title, pub_date, duration, duration,
                views, watch_time, subs, likes, dislikes,
                new_v, ret_v, impr, ctr, avd, now_str, content_id
            ))
            updated_count += 1
        else:
            # Insert new video record
            course, topic, fmt = categorize_video(title, "")
            thumb = f"https://img.youtube.com/vi/{content_id}/hqdefault.jpg"
            cursor.execute("""
                INSERT INTO videos (
                    id, title, description, thumbnail_url, published_at,
                    duration_seconds, course, topic, format, category_override,
                    views, likes, dislikes, new_viewers, returning_viewers,
                    comments, impressions, ctr, avg_view_duration,
                    watch_time_hours, subscribers_gained, updated_at
                ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
            """, (
                content_id, title, thumb, pub_date,
                duration, course, topic, fmt,
                views, likes, dislikes, new_v, ret_v,
                impr, ctr, avd, watch_time, subs, now_str
            ))
            inserted_count += 1

    print(f"-> Videos updated: {updated_count}, Videos inserted: {inserted_count}")

    # 5. Update settings table with total lifetime channel metrics
    tot_views = safe_int(total_row[8]) if total_row and len(total_row) > 8 else 504631
    tot_watch = safe_float(total_row[9]) if total_row and len(total_row) > 9 else 42600.65
    tot_subs = safe_int(total_row[10]) if total_row and len(total_row) > 10 else 7421
    tot_likes = safe_int(total_row[4]) if total_row and len(total_row) > 4 else 7940
    tot_dislikes = safe_int(total_row[5]) if total_row and len(total_row) > 5 else 433
    tot_impr = safe_int(total_row[11]) if total_row and len(total_row) > 11 else 5943695
    tot_ctr = safe_float(total_row[12]) if total_row and len(total_row) > 12 else 5.22

    settings_to_update = [
        ("channel_views", str(tot_views)),
        ("manual_channel_views", str(tot_views)),
        ("channel_subscribers", str(tot_subs)),
        ("manual_channel_subscribers", str(tot_subs)),
        ("channel_total_watch_time", str(tot_watch)),
        ("channel_total_likes", str(tot_likes)),
        ("channel_total_dislikes", str(tot_dislikes)),
        ("channel_total_impressions", str(tot_impr)),
        ("channel_avg_ctr", str(tot_ctr)),
        ("last_analytics_import", now_str)
    ]

    for k, v in settings_to_update:
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.commit()

    # Verify totals in database
    cursor.execute("""
        SELECT 
            COUNT(*) as vid_count,
            SUM(views) as sum_views,
            SUM(watch_time_hours) as sum_watch,
            SUM(likes) as sum_likes,
            SUM(dislikes) as sum_dislikes,
            SUM(subscribers_gained) as sum_subs,
            SUM(impressions) as sum_impr
        FROM videos
    """)
    totals = dict(cursor.fetchone())
    conn.close()

    print("\n=== VERIFIED DATABASE TOTALS ===")
    print(f"Total Videos in DB: {totals['vid_count']}")
    print(f"Total Views: {totals['sum_views']:,} (Lifetime Target: {tot_views:,})")
    print(f"Total Watch Time: {totals['sum_watch']:,.1f} hrs (Lifetime Target: {tot_watch:,.1f})")
    print(f"Total Likes: {totals['sum_likes']:,} (Lifetime Target: {tot_likes:,})")
    print(f"Total Dislikes: {totals['sum_dislikes']:,} (Lifetime Target: {tot_dislikes:,})")
    print(f"Total Subscribers Gained: {totals['sum_subs']:,} (Lifetime Target: {tot_subs:,})")
    print(f"Total Impressions: {totals['sum_impr']:,} (Lifetime Target: {tot_impr:,})")
    print("================================")


if __name__ == "__main__":
    run_import()
