//=========================================================================================
// Input CSV Formatting and Info
//=========================================================================================
// This code expects the input csv to have the following column names and mapping, in the given order
// Expected                 Default may be              Represents
// id                       id.only                     Id for thesis
// url                      dc.identifier.uri           Link to thesis page in OSU Scholars Archive
// author                   dc.creator                  Author of a given thesis
// title                    dc.title                    Title of a given thesis
// year                     dc.description              Year thesis was submitted
// multiple_grad_year       multiple grad year          Whether author had multiple graduation years
// degree_level             dc.degree.level             Degree level of author when thesis submitted (i.e Doctoral, Masters, Bachelors)
// degree_fullName          dc.degree.name              Full degree name (e.g. Master's of Science (M.S.) in Chemistry)
// degree_type              dc.degree.name 1            First half of full degree name (e.g. Master's of Science (M.S.), Doctor of Philosophy (Ph.D), etc.)
// degree_field             dc.degree.name 2            Second half of full degree name, which is a field of study (e.g. Agriculture, Chemistry, Computer Science, etc.)
// degree_topic             dc.degree.topic             Groups degree fields into ~20 categories - used to filter visualizer
// downloads                downloads                   Number of downloads for a given thesis