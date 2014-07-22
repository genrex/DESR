using System;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Script.Serialization;
using System.Text.RegularExpressions;
using System.Net;
using System.Collections;
using System.Configuration;
using Microsoft.SharePoint;
using Microsoft.SharePoint.Client;
using Microsoft.SharePoint.Administration.Claims;
using Microsoft.SharePoint.WebControls;
using Microsoft.SharePoint.Administration;
using System.IO;
using System.ServiceModel.Web;
using System.Data;
using System.Data.SqlClient;
using Microsoft.SharePoint.Utilities;

public partial class svc : System.Web.UI.Page
{
    private const string OpNameParameter = "op";

    private const string JsonErrorFmt =
        @"{{
                  ""error"" : {{
                    ""code"" : ""{0}"",
                    ""message"" : {{
                      ""lang"" : ""{4}"",
                      ""value"" : ""Method {1}: {2}{3}""
                    }}
                  }}
                }}";

    // ReSharper disable CoVariantArrayConversion

    /// <summary>
    ///    Handles the Load event of the Page control.
    /// </summary>
    /// <param name="sender">The source of the event.</param>
    /// <param name="e">
    ///    The <see cref="System.EventArgs" /> instance containing the event data.
    /// </param>
    protected void Page_Load(object sender, EventArgs e)
    {
        var opName = "Unknown";
        try
        {
            opName = Request.Params[OpNameParameter];
            if (string.IsNullOrEmpty(opName))
                throw new Exception(string.Format("{0} parameter not found in request!", OpNameParameter));

            var opMethodInfo = GetType().GetMethod(opName);
            if (opMethodInfo == null)
                throw new Exception("Operation not found!");

            var parameters = opMethodInfo.GetParameters().Select(pn => Convert.ChangeType(Request.Params[pn.Name], pn.ParameterType)).ToArray();
            var opResult = parameters.Length > 0 ? opMethodInfo.Invoke(this, parameters) : opMethodInfo.Invoke(this, null);
            if (opName != "DownloadFileLocal")
            {
                WriteResponse(200, opResult);
            }
        }
        catch (Exception ex)
        {
            var exResult = string.Format(JsonErrorFmt, 400, opName, ex.Message, ex.InnerException != null ? string.Format(" &raquo; {0}", ex.InnerException.Message) : string.Empty, string.Empty);
            WriteResponse(400, exResult);
        }
        Response.End();
    }

    #region Private Helper Methods

    // ReSharper restore CoVariantArrayConversion

    /// <summary>
    ///    Writes the response.
    /// </summary>
    /// <param name="httpStatusCode">The HTTP status code.</param>
    /// <param name="opResult">The operation result.</param>
    private void WriteResponse(int httpStatusCode, object opResult)
    {
        Response.Clear();
        Response.StatusCode = httpStatusCode;
        Response.ContentType = "application/json; charset=utf-8";
        Response.Write(opResult);
    }

    /// <summary>
    ///    Creates the json response.
    /// </summary>
    /// <param name="data">The data.</param>
    /// <returns></returns>
    private static string CreateJsonResponse(object data)
    {
        var js = new JavaScriptSerializer();
        string results;
        if (data is IList)
        {
            var list = (data as IList);
            var enumerable = list as object[] ?? list.Cast<object>().ToArray();
            var count = enumerable.Count();
            results = js.Serialize(new
            {
                d = new
                {
                    results = enumerable,
                    __count = count
                }
            });
        }
        else
        {
            results = js.Serialize(new
            {
                d = new
                {
                    results = data
                }
            });
        }
        return results;
    }

    private string GetValue(object obj)
    {
        try
        {
            return obj.ToString();
        }
        catch
        {
            return "";
        }
    }

    #endregion

    #region OP::GetDocuments

    private class JsonDocument
    {
        public int ID;
        public string Name;
    }

    public string GetDocuments(string SPUrl)
    {
        List<JsonDocument> documents = new List<JsonDocument>();

        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists.TryGetList("DESRSystems");
                if (mList != null)
                {
                    foreach (SPListItem mItem in mList.Items)
                    {
                        documents.Add(new JsonDocument
                        {
                            ID = mItem.ID,
                            Name = GetValue(mItem["FileLeafRef"])
                        });
                    }
                }
            }
        }
        return CreateJsonResponse(documents.ToArray());
    }

    #endregion

    #region OP::Authenticate

    public string Authenticate(string authInfo, string currentURL, string SPUrl)
    {
        try
        {
            var request = WebRequest.Create(currentURL.ToLower().Substring(0, currentURL.ToLower().LastIndexOf("main.html")) + "AuthorizationCheck/test.html");
            //var request = WebRequest.Create(currentURL.Substring(0, currentURL.LastIndexOf("/") - 10) + "/AuthorizationCheck/test.html");
            request.Headers["Authorization"] = "Basic " + authInfo;
            var response = request.GetResponse();
            return CreateJsonResponse(true);
        }
        catch (Exception ex)
        {
            return CreateJsonResponse(false);
        }
    }

    #endregion

    #region OP:Login

    public void Login(string SPUrl)
    {
        this.AddLog(SPUrl, "LOGIN", null);
    }

    #endregion

    #region OP::GetAllCatalogs

    public string GetAllCatalogs(string SPUrl, int position, string modality, string documentType)
    {
        List<Catalog> documents = new List<Catalog>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESRSystems"];
                SPQuery camlQuery = new SPQuery();
                if (modality == "All" && documentType == "All")
                {
                    camlQuery.Query = @"<Where>
                                      <IsNotNull>
                                         <FieldRef Name='Modality' />
                                      </IsNotNull>
                                   </Where>";
                }
                else
                {
                    if (modality == "All")
                    {
                        camlQuery.Query = string.Format(@"<Where>
                                          <And>
                                             <IsNotNull>
                                                <FieldRef Name='Modality' />
                                             </IsNotNull>
                                             <Eq>
                                                <FieldRef Name='SystemType' />
                                                <Value Type='Text'>{0}</Value>
                                             </Eq>
                                          </And>
                                       </Where>", documentType);
                    }
                    else if (documentType == "All")
                    {
                        camlQuery.Query = string.Format(@"<Where>
                                          <Eq>
                                             <FieldRef Name='Modality' />
                                             <Value Type='Choice'>{0}</Value>
                                          </Eq>
                                       </Where>", modality);
                    }
                    else
                    {
                        camlQuery.Query = string.Format(@"<Where>
                                                      <And>
                                                         <Eq>
                                                            <FieldRef Name='Modality' />
                                                            <Value Type='Choice'>{0}</Value>
                                                         </Eq>
                                                         <Eq>
                                                            <FieldRef Name='SystemType' />
                                                            <Value Type='Text'>{1}</Value>
                                                         </Eq>
                                                      </And>
                                                   </Where>", modality, documentType);
                    }
                }
                camlQuery.RowLimit = 20 * Convert.ToUInt32(position);

                SPListItemCollection listItems = mList.GetItems(camlQuery);
                foreach (SPListItem item in listItems)
                {
                    Catalog cat = new Catalog
                    {
                        Modality = item["Modality"] + "",
                        Product = item["Title"] + "",
                        SystemType = item["SystemType"] + "",
                        MCSS = item["MCSS"] + "",
                        Software_x0020_Version = item["Software_x0020_Version"] + "",
                        Revision_x0020_Level = item["Revision_x0020_Level"] + "",
                        System_x0020_Date = item["System_x0020_Date"] + "",
                        ID = item["ID"] + "",
                        ImageURL = "" //item["ImageURL"] + ""
                    };
                    if (item["ImageURL"] + "" != "")
                    {
                        cat.ImageURL = DownloadFile(item["ImageURL"] + "");
						//cat.ImageURL = Path.GetFileName(item["ImageURL"]).ToString();
                    }
                    documents.Add(cat);
                }
            }
        }
        return CreateJsonResponse(documents.ToArray());
    }

    public string GetNewestCatalogs(string SPUrl, int position, string modality, string documentType)
    {
        List<Catalog> documents = new List<Catalog>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESRSystems"];
                SPQuery camlQuery = new SPQuery();
                if (modality == "All" && documentType == "All")
                {
                    camlQuery.Query = @"<Where>
                                      <IsNotNull>
                                         <FieldRef Name='Modality' />
                                      </IsNotNull>
                                   </Where>
                                    <OrderBy>
                                        <FieldRef Name='System_x0020_Date' Ascending='FALSE' />
                                    </OrderBy>";
                }
                else
                {
                    if (modality == "All")
                    {
                        camlQuery.Query = string.Format(@"<Where>
                                          <And>
                                             <IsNotNull>
                                                <FieldRef Name='Modality' />
                                             </IsNotNull>
                                             <Eq>
                                                <FieldRef Name='SystemType' />
                                                <Value Type='Text'>{0}</Value>
                                             </Eq>
                                          </And>
                                       </Where>
                                    <OrderBy>
                                        <FieldRef Name='System_x0020_Date' Ascending='FALSE' />
                                    </OrderBy>", documentType);
                    }
                    else if (documentType == "All")
                    {
                        camlQuery.Query = string.Format(@"<Where>
                                          <Eq>
                                             <FieldRef Name='Modality' />
                                             <Value Type='Choice'>{0}</Value>
                                          </Eq>
                                       </Where>
                                    <OrderBy>
                                        <FieldRef Name='System_x0020_Date' Ascending='FALSE' />
                                    </OrderBy>", modality);
                    }
                    else
                    {
                        camlQuery.Query = string.Format(@"<Where>
                                                      <And>
                                                         <Eq>
                                                            <FieldRef Name='Modality' />
                                                            <Value Type='Choice'>{0}</Value>
                                                         </Eq>
                                                         <Eq>
                                                            <FieldRef Name='SystemType' />
                                                            <Value Type='Text'>{1}</Value>
                                                         </Eq>
                                                      </And>
                                                   </Where>
                                    <OrderBy>
                                        <FieldRef Name='System_x0020_Date' Ascending='FALSE' />
                                    </OrderBy>", modality, documentType);
                    }
                }
                camlQuery.RowLimit = 20 * Convert.ToUInt32(position);

                SPListItemCollection listItems = mList.GetItems(camlQuery);
                foreach (SPListItem item in listItems)
                {
                    Catalog cat = new Catalog
                    {
                        Modality = item["Modality"] + "",
                        Product = item["Title"] + "",
                        SystemType = item["SystemType"] + "",
                        MCSS = item["MCSS"] + "",
                        Software_x0020_Version = item["Software_x0020_Version"] + "",
                        Revision_x0020_Level = item["Revision_x0020_Level"] + "",
                        System_x0020_Date = item["System_x0020_Date"] + "",
                        ID = item["ID"] + "",
                        ImageURL = "" //item["ImageURL"] + ""
                    };
                    if (item["ImageURL"] + "" != "")
                    {
                        cat.ImageURL = DownloadFile(item["ImageURL"] + "");
                    }
                    documents.Add(cat);
                }
            }
        }
        return CreateJsonResponse(documents.ToArray());
    }

    public string SearchCatalogs(string SPUrl, string searchText, string modality, string documentType)
    {
        List<Catalog> documents = new List<Catalog>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESRSystems"];
                SPQuery camlQuery = new SPQuery();
                if (modality == "All" && documentType == "All")
                {
                    camlQuery.Query = "<Where><Or><Or><Or><Contains><FieldRef Name='Title' /><Value Type='Text'>" + searchText + "</Value></Contains><Contains><FieldRef Name='Software_x0020_Version' /><Value Type='Text'>" + searchText + "</Value></Contains></Or><Contains><FieldRef Name='Modality' /><Value Type='Choice'>" + searchText + "</Value></Contains></Or><Contains><FieldRef Name='SystemType' /><Value Type='Text'>" + searchText + "</Value></Contains></Or></Where>";
                }
                else
                {
                    if (modality == "All")
                    {
                        camlQuery.Query = "<Where><And><Or><Or><Contains><FieldRef Name='Title' /><Value Type='Text'>" + searchText + "</Value></Contains><Contains><FieldRef Name='Software_x0020_Version' /><Value Type='Text'>" + searchText + "</Value></Contains></Or><Contains><FieldRef Name='Modality' /><Value Type='Choice'>" + searchText + "</Value></Contains></Or><Eq><FieldRef Name='SystemType' /><Value Type='Text'>" + documentType + "</Value></Eq></And></Where>";
                    }
                    else if (documentType == "All")
                    {
                        camlQuery.Query = "<Where><And><Or><Or><Contains><FieldRef Name='Title' /><Value Type='Text'>" + searchText + "</Value></Contains><Contains><FieldRef Name='Software_x0020_Version' /><Value Type='Text'>" + searchText + "</Value></Contains></Or><Contains><FieldRef Name='SystemType' /><Value Type='Text'>" + searchText + "</Value></Contains></Or><Eq><FieldRef Name='Modality' /><Value Type='Choice'>" + modality + "</Value></Eq></And></Where>";
                    }
                    else
                    {
                        camlQuery.Query = "<Where><And><And><Or><Contains><FieldRef Name='Title' /><Value Type='Text'>" + searchText + "</Value></Contains><Contains><FieldRef Name='Software_x0020_Version' /><Value Type='Text'>" + searchText + "</Value></Contains></Or><Eq><FieldRef Name='Modality' /><Value Type='Choice'>" + modality + "</Value></Eq></And><Eq><FieldRef Name='SystemType' /><Value Type='Text'>" + documentType + "</Value></Eq></And></Where>";
                    }
                }
                SPListItemCollection listItems = mList.GetItems(camlQuery);
                foreach (SPListItem item in listItems)
                {
                    Catalog cat = new Catalog
                    {
                        Modality = item["Modality"] + "",
                        Product = item["Title"] + "",
                        SystemType = item["SystemType"] + "",
                        MCSS = item["MCSS"] + "",
                        Software_x0020_Version = item["Software_x0020_Version"] + "",
                        Revision_x0020_Level = item["Revision_x0020_Level"] + "",
                        System_x0020_Date = item["System_x0020_Date"] + "",
                        ID = item["ID"] + "",
                        ImageURL = "" // item["ImageURL"] + ""
                    };
                    if (item["ImageURL"] + "" != "")
                    {
                        cat.ImageURL = DownloadFile(item["ImageURL"] + "");
                    }
                    documents.Add(cat);
                }
            }
        }
        this.AddLog(SPUrl, "SEARCHED", searchText);
        return CreateJsonResponse(documents.ToArray());
    }

    public string GetCatalogById(string SPUrl, int id)
    {
        List<Catalog> documents = new List<Catalog>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESRSystems"];
                SPListItem item = mList.GetItemById(id);
                Catalog cat = new Catalog
                {
                    Modality = item["Modality"] + "",
                    Product = item["Title"] + "",
                    SystemType = item["SystemType"] + "",
                    MCSS = item["MCSS"] + "",
                    Software_x0020_Version = item["Software_x0020_Version"] + "",
                    Revision_x0020_Level = item["Revision_x0020_Level"] + "",
                    System_x0020_Date = item["System_x0020_Date"] + "",
                    ID = item["ID"] + "",
                    ImageURL = "" //item["ImageURL"] + ""
                };
                if (item["ImageURL"] + "" != "")
                {
                    cat.ImageURL = DownloadFile(item["ImageURL"] + "");
                }
                documents.Add(cat);
            }
        }
        return CreateJsonResponse(documents.ToArray());
    }

    #endregion

    #region OP:AddStatus

    public string AddStatus(string SPUrl,int recordId, string ControlPanelLayout, string ModalityWorkListEmpty, string AllSoftwareLoadedAndFunctioning, string IfNoExplain, string NPDPresetsOnSystem, string HDDFreeOfPatientStudies, string DemoImagesLoadedOnHardDrive, string SystemPerformedAsExpected, string AnyIssuesDuringDemo, string wasServiceContacted, string ConfirmModalityWorkListRemoved, string ConfirmSystemHDDEmptied, string LayoutChangeExplain, string Comments, string WorkPhone)
    {
        string id = null;
        WorkPhone = WorkPhone.Substring(0, 3) + "-" + WorkPhone.Substring(3, 3) + "-" + WorkPhone.Substring(6);
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESRSystems"];
                SPListItem item = mList.GetItemById(recordId);
                SPList desrList = web.Lists["DESR"];
                web.AllowUnsafeUpdates = true;

                //update desrsystem list
                item["MCSS"] = web.CurrentUser;
                item["System_x0020_Date"] = DateTime.Today.ToString();
                item.Update();
                //end update

                SPListItem desrItem = desrList.AddItem();
                desrItem["Serial_x0020_Number"] = item["Title"];
                desrItem["Software_x0020_Version"] = item["Software_x0020_Version"];
                desrItem["Revision_x0020_Level"] = item["Revision_x0020_Level"];
                desrItem["System_x0020_Date"] = item["System_x0020_Date"];
                desrItem["Modality"] = item["Modality"];
                desrItem["SystemType"] = item["SystemType"];
                desrItem["MCSS"] = item["MCSS"];
                desrItem["ControlPanelLayout"] = ControlPanelLayout;
                desrItem["ModalityWorkListEmpty"] = ModalityWorkListEmpty;
                desrItem["AllSoftwareLoadedAndFunctioning"] = AllSoftwareLoadedAndFunctioning;
                desrItem["IfNoExplain"] = IfNoExplain;
                desrItem["NPDPresetsOnSystem"] = NPDPresetsOnSystem;
                desrItem["HDDFreeOfPatientStudies"] = HDDFreeOfPatientStudies;
                desrItem["DemoImagesLoadedOnHardDrive"] = DemoImagesLoadedOnHardDrive;
                desrItem["SystemPerformedAsExpected"] = SystemPerformedAsExpected;
                desrItem["AnyIssuesDuringDemo"] = AnyIssuesDuringDemo;
                desrItem["wasServiceContacted"] = wasServiceContacted;
                desrItem["ConfirmModalityWorkListRemoved"] = ConfirmModalityWorkListRemoved;
                desrItem["ConfirmSystemHDDEmptied"] = ConfirmSystemHDDEmptied;
                desrItem["LayoutChangeExplain"] = LayoutChangeExplain;
                desrItem["Comments"] = Comments;
                desrItem.Update();
                id = desrItem["ID"] + "";
                web.AllowUnsafeUpdates = false;
                SPUser css = web.CurrentUser;


                string SystemDate = item["System_x0020_Date"].ToString();
                SystemDate = ((SystemDate != null && SystemDate != "") ? Convert.ToDateTime(SystemDate).ToShortDateString() : "");
                string messageBody = "<html><head><style>body{font-size:12.0pt;font-family:'Calibri','sans-serif';}p{margin-right:0in;margin-left:0in;font-size:12.0pt;font-family:'Calibri','serif';}</style></head><body ><div class=WordSection1>&nbsp;<table border=0 cellspacing=0 cellpadding=0 style='width:623;'> <tr>  <td colspan=2 valign=top>  This is a system generated email to notify you about a demo equipment’s critical status.  </td> </tr> <tr>  <td colspan=2 valign=top >  &nbsp;  </td> </tr> <tr>  <td colspan=2 valign=top >  <b><u>System information</u></b>  </td> </tr> <tr>  <td valign=top >  System type:  </td>  <td valign=top >" + item["SystemType"] + "</td> </tr> <tr>  <td valign=top >  System serial number:  </td>  <td valign=top >  " + item["Title"] + "  </td> </tr> <tr>  <td valign=top >Software version:  </td>  <td valign=top > " + item["Software_x0020_Version"] + "  </td> </tr> <tr>  <td valign=top >  Revision Level:  </td>  <td valign=top >  " + item["Revision_x0020_Level"] + "  </td> </tr> <tr>  <td valign=top >  Date:  </td>  <td  valign=top >  " + SystemDate + "  </td> </tr> <tr>  <td valign=top >  CSS:  </td>  <td valign=top >  " + css.Name + "  </td> </tr><tr>  <td valign=top >  Comments:  </td>  <td valign=top >  " + Comments + "  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >  &nbsp;  </td> </tr> <tr>  <td colspan=2 valign=top >  <b><u>System condition on arrival</u></b>  </td> </tr> <tr>  <td valign=top >  Control panel layout:  </td>  <td valign=top >  " + ControlPanelLayout + "  </td> </tr><tr>  <td valign=top >  Explain if changed:  </td>  <td valign=top >  " + LayoutChangeExplain + "  </td> </tr> <tr>  <td valign=top >  Modality work list empty:  </td>  <td valign=top >  " + ModalityWorkListEmpty + "  </td> </tr> <tr>  <td valign=top >  All software loaded and functioning:  </td>  <td valign=top >  " + AllSoftwareLoadedAndFunctioning + "  </td> </tr> <tr>  <td valign=top >  Please explain:  </td>  <td valign=top >  " + IfNoExplain + "  </td> </tr> <tr>  <td valign=top >  NPD presets on system:  </td>  <td valign=top >  " + NPDPresetsOnSystem + "  </td> </tr> <tr>  <td valign=top >  HDD free of patients studies:  </td>  <td valign=top >  " + HDDFreeOfPatientStudies + "  </td> </tr> <tr>  <td valign=top >  Demo images loaded on hard drive:  </td>  <td valign=top >  " + DemoImagesLoadedOnHardDrive + "  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >  &nbsp;  </td> </tr> <tr>  <td colspan=2 valign=top >  <b><u>Before leaving customer site</u></b>  </td> </tr> <tr>  <td valign=top >  System performed as expected:  </td>  <td valign=top >  " + SystemPerformedAsExpected + "  </td> </tr> <tr>  <td valign=top>  Were any issues discovered with system during demo</span>:  </td>  <td valign=top>    " + AnyIssuesDuringDemo + "  </td> </tr> <tr>  <td valign=top>  Was service contacted:  </td>  <td valign=top>    " + wasServiceContacted + "  </td> </tr> <tr>  <td valign=top>  Confirm modality work list removed from system:  </td>  </span>  <td valign=top>    " + ConfirmModalityWorkListRemoved + "  </td> </tr> <tr>  <td valign=top>  Confirm system HDD emptied of all patient studies:  </td>  </span>  <td valign=top >    " + ConfirmSystemHDDEmptied + "  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  <b><u>Specialist Information</u></b>  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  " + web.CurrentUser.Name + "  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top>  " + WorkPhone + "   </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  " + web.CurrentUser.Email.ToLower() + "  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >    &nbsp;  </td> </tr></table></div></body></html>";

                SPList emailsList = web.Lists["DESREmailRecepients"];
                string plannerEmail = "";
                string appManagersEmails = "";
                foreach (SPListItem emailItem in emailsList.Items)
                {
                    if (Convert.ToString(emailItem["Title"]).ToLower() == "planner")
                    {
                        plannerEmail = Convert.ToString(emailItem["Email"]);
                    }
                    if (Convert.ToString(emailItem["Title"]).ToLower() == Convert.ToString(item["Modality"]).ToLower())
                    {
                        appManagersEmails += Convert.ToString(emailItem["Email"]) + ";";
                    }
                }

                if (AllSoftwareLoadedAndFunctioning == "No" || HDDFreeOfPatientStudies == "No" || SystemPerformedAsExpected == "No" || AnyIssuesDuringDemo == "Yes")
                {
                    SPUtility.SendEmail(web, false, false, plannerEmail, "Demo Equipment Status Alert - " + item["SystemType"] + " - " + item["Title"], messageBody);
                }

                if (NPDPresetsOnSystem == "No" || HDDFreeOfPatientStudies == "No" || DemoImagesLoadedOnHardDrive == "No" || ConfirmModalityWorkListRemoved == "No" || ConfirmSystemHDDEmptied == "No")
                {
                    SPUtility.SendEmail(web, false, false, appManagersEmails + plannerEmail, "Demo Equipment Status Alert - " + item["SystemType"] + " - " + item["Title"], messageBody);
                }
            }
        }
        this.AddLog(SPUrl, "ADD STATUS", null);
        return id;
    }

    public string AddNewStatus(string SPUrl, string SerialNumber, string SoftwareVersion, string RevisionLevel, string SystemType, string Modality, string ControlPanelLayout, string ModalityWorkListEmpty, string AllSoftwareLoadedAndFunctioning, string IfNoExplain, string NPDPresetsOnSystem, string HDDFreeOfPatientStudies, string DemoImagesLoadedOnHardDrive, string SystemPerformedAsExpected, string AnyIssuesDuringDemo, string wasServiceContacted, string ConfirmModalityWorkListRemoved, string ConfirmSystemHDDEmptied, string LayoutChangeExplain, string Comments, string WorkPhone)
    {
        string id = null;
        WorkPhone = WorkPhone.Substring(0, 3) + "-" + WorkPhone.Substring(3, 3) + "-" + WorkPhone.Substring(6);
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList desrList = web.Lists["DESR"];
                web.AllowUnsafeUpdates = true;

                SPListItem desrItem = desrList.AddItem();
                desrItem["Serial_x0020_Number"] = SerialNumber;
                desrItem["Software_x0020_Version"] = SoftwareVersion;
                desrItem["Revision_x0020_Level"] = RevisionLevel;
                desrItem["System_x0020_Date"] = DateTime.Today.ToString();
                desrItem["Modality"] = Modality;
                desrItem["SystemType"] = SystemType;
                desrItem["MCSS"] = web.CurrentUser;
                desrItem["ControlPanelLayout"] = ControlPanelLayout;
                desrItem["ModalityWorkListEmpty"] = ModalityWorkListEmpty;
                desrItem["AllSoftwareLoadedAndFunctioning"] = AllSoftwareLoadedAndFunctioning;
                desrItem["IfNoExplain"] = IfNoExplain;
                desrItem["NPDPresetsOnSystem"] = NPDPresetsOnSystem;
                desrItem["HDDFreeOfPatientStudies"] = HDDFreeOfPatientStudies;
                desrItem["DemoImagesLoadedOnHardDrive"] = DemoImagesLoadedOnHardDrive;
                desrItem["SystemPerformedAsExpected"] = SystemPerformedAsExpected;
                desrItem["AnyIssuesDuringDemo"] = AnyIssuesDuringDemo;
                desrItem["wasServiceContacted"] = wasServiceContacted;
                desrItem["ConfirmModalityWorkListRemoved"] = ConfirmModalityWorkListRemoved;
                desrItem["ConfirmSystemHDDEmptied"] = ConfirmSystemHDDEmptied;
                desrItem["LayoutChangeExplain"] = LayoutChangeExplain;
                desrItem["Comments"] = Comments;
                desrItem.Update();
                id = desrItem["ID"] + "";
                web.AllowUnsafeUpdates = false;
                SPUser css = web.CurrentUser;

                string SystemDate = desrItem["System_x0020_Date"].ToString();
                SystemDate = ((SystemDate != null && SystemDate != "") ? Convert.ToDateTime(SystemDate).ToShortDateString() : "");


                string messageBody = "<html><head><style>body{font-size:12.0pt;font-family:'Calibri','sans-serif';}p{margin-right:0in;margin-left:0in;font-size:12.0pt;font-family:'Calibri','serif';}</style></head><body ><div class=WordSection1>&nbsp;<table border=0 cellspacing=0 cellpadding=0 style='width:623;'> <tr>  <td colspan=2 valign=top>  This is a system generated email to notify you about a demo equipment’s critical status.  </td> </tr> <tr>  <td colspan=2 valign=top >  &nbsp;  </td> </tr> <tr>  <td colspan=2 valign=top >  <b><u>System information</u></b>  </td> </tr> <tr>  <td valign=top >  System type:  </td>  <td valign=top >" + desrItem["SystemType"] + "</td> </tr> <tr>  <td valign=top >  System serial number:  </td>  <td valign=top >  " + SerialNumber + "  </td> </tr> <tr>  <td valign=top >Software version:  </td>  <td valign=top > " + desrItem["Software_x0020_Version"] + "  </td> </tr> <tr>  <td valign=top >  Revision Level:  </td>  <td valign=top >  " + desrItem["Revision_x0020_Level"] + "  </td> </tr> <tr>  <td valign=top >  Date:  </td>  <td  valign=top >  " + SystemDate + "  </td> </tr> <tr>  <td valign=top >  CSS:  </td>  <td valign=top >  " + css.Name + "  </td> </tr><tr>  <td valign=top >  Comments:  </td>  <td valign=top >  " + Comments + "  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >  &nbsp;  </td> </tr> <tr>  <td colspan=2 valign=top >  <b><u>System condition on arrival</u></b>  </td> </tr> <tr>  <td valign=top >  Control panel layout:  </td>  <td valign=top >  " + ControlPanelLayout + "  </td> </tr><tr>  <td valign=top >  Explain if changed:  </td>  <td valign=top >  " + LayoutChangeExplain + "  </td> </tr> <tr>  <td valign=top >  Modality work list empty:  </td>  <td valign=top >  " + ModalityWorkListEmpty + "  </td> </tr> <tr>  <td valign=top >  All software loaded and functioning:  </td>  <td valign=top >  " + AllSoftwareLoadedAndFunctioning + "  </td> </tr> <tr>  <td valign=top >  Please explain:  </td>  <td valign=top >  " + IfNoExplain + "  </td> </tr> <tr>  <td valign=top >  NPD presets on system:  </td>  <td valign=top >  " + NPDPresetsOnSystem + "  </td> </tr> <tr>  <td valign=top >  HDD free of patients studies:  </td>  <td valign=top >  " + HDDFreeOfPatientStudies + "  </td> </tr> <tr>  <td valign=top >  Demo images loaded on hard drive:  </td>  <td valign=top >  " + DemoImagesLoadedOnHardDrive + "  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >  &nbsp;  </td> </tr> <tr>  <td colspan=2 valign=top >  <b><u>Before leaving customer site</u></b>  </td> </tr> <tr>  <td valign=top >  System performed as expected:  </td>  <td valign=top >  " + SystemPerformedAsExpected + "  </td> </tr> <tr>  <td valign=top>  Were any issues discovered with system during demo</span>:  </td>  <td valign=top>    " + AnyIssuesDuringDemo + "  </td> </tr> <tr>  <td valign=top>  Was service contacted:  </td>  <td valign=top>    " + wasServiceContacted + "  </td> </tr> <tr>  <td valign=top>  Confirm modality work list removed from system:  </td>  </span>  <td valign=top>    " + ConfirmModalityWorkListRemoved + "  </td> </tr> <tr>  <td valign=top>  Confirm system HDD emptied of all patient studies:  </td>  </span>  <td valign=top >    " + ConfirmSystemHDDEmptied + "  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  <b><u>Specialist Information</u></b>  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  " + web.CurrentUser.Name + "  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top>  " + WorkPhone + "   </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  " + web.CurrentUser.Email.ToLower() + "  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >    &nbsp;  </td> </tr> <tr>  <td valign=top >  &nbsp;  </td>  <td valign=top >    &nbsp;  </td> </tr></table></div></body></html>";

                SPList emailsList = web.Lists["DESREmailRecepients"];
                string plannerEmail = "";
                string appManagersEmails = "";
                foreach (SPListItem emailItem in emailsList.Items)
                {
                    if (Convert.ToString(emailItem["Title"]).ToLower() == "planner")
                    {
                        plannerEmail = Convert.ToString(emailItem["Email"]);
                    }
                    if (Convert.ToString(emailItem["Title"]).ToLower() == Modality.ToLower())
                    {
                        appManagersEmails += Convert.ToString(emailItem["Email"]) + ";";
                    }
                }

                if (AllSoftwareLoadedAndFunctioning == "No" || HDDFreeOfPatientStudies == "No" || SystemPerformedAsExpected == "No" || AnyIssuesDuringDemo == "Yes")
                {
                    SPUtility.SendEmail(web, false, false, plannerEmail, "Demo Equipment Status Alert - " + SystemType + " - " + SerialNumber, messageBody);
                }

                if (NPDPresetsOnSystem == "No" || HDDFreeOfPatientStudies == "No" || DemoImagesLoadedOnHardDrive == "No" || ConfirmModalityWorkListRemoved == "No" || ConfirmSystemHDDEmptied == "No")
                {
                    SPUtility.SendEmail(web, false, false, appManagersEmails + plannerEmail, "Demo Equipment Status Alert - " + SystemType + " - " + SerialNumber, messageBody);
                }
            }
        }
        this.AddLog(SPUrl, "ADD NEW", null);
        return id;
    }

    public class Catalog
    {
        public string Modality;
        public string Product;
        public string SystemType;
        public string Software_x0020_Version;
        public string Revision_x0020_Level;
        public string System_x0020_Date;
        public string MCSS;
        public string Serial_x0020_Number;
        public string Total_x0020_Quantity_x0020_Ordered;
        public string ID;
        public string ImageURL;
    }

    #endregion

    #region OP::GetUserInfo

    public string GetUserInfo(string SPUrl)
    {
        List<string> documents = new List<string>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                documents.Add(web.CurrentUser.Name);
                documents.Add(web.CurrentUser.Email);

            }
        }
        return CreateJsonResponse(documents.ToArray());
    }

    #endregion
   
    #region OP:DownloadFile

    public string DownloadFile(string fileURL)
    {
        try
        {
            string stream = null;
            using (SPSite site = new SPSite(System.Configuration.ConfigurationManager.AppSettings["DownloadedFilesSite"]))
            {
                using (SPWeb web = site.OpenWeb())
                {
                    
                    
                    SPFile file = web.GetFile(fileURL);
                    byte[] data = file.OpenBinary();
                    if (!System.IO.File.Exists(@"" + System.Configuration.ConfigurationManager.AppSettings["DownloadedFilesFolder"] + file.Name))
                    {
                        FileStream fs = new FileStream(@"" + System.Configuration.ConfigurationManager.AppSettings["DownloadedFilesFolder"] + file.Name, FileMode.Create, FileAccess.Write);
                        BinaryWriter w = new BinaryWriter(fs);
                        w.Write(data, 0, (int)file.Length);
                        w.Close();
                        fs.Close();
                    }
                    stream = file.Name;
                }
            }
            return stream;
        }
        catch (Exception ex) { return null; }
    }

    public void DownloadFileLocal(string fileName)
    {
        try
        {
            Response.Buffer = false;
            Response.Clear();
            Response.ClearContent();

            Response.AppendHeader("Content-Disposition", string.Format("attachment; filename=\"{0}\"", fileName));

            using (FileStream stream = new FileStream(@"" + System.Configuration.ConfigurationManager.AppSettings["DownloadedFilesFolder"] + fileName, FileMode.Open, FileAccess.Read))
            {
                using (BinaryReader reader = new BinaryReader(stream))
                {
                    string mimeType = "application/unknown";
                    string ext = System.IO.Path.GetExtension(fileName).ToLower();
                    Microsoft.Win32.RegistryKey regKey = Microsoft.Win32.Registry.ClassesRoot.OpenSubKey(ext);
                    if (regKey != null && regKey.GetValue("Content Type") != null)
                    {
                        mimeType = regKey.GetValue("Content Type").ToString();
                    }
                    Response.ContentType = mimeType;
                    Response.BinaryWrite(reader.ReadBytes((int)stream.Length - 1));
                }
            }
        }
        catch (Exception ex)
        {
            //log exception or return error
        }
    }

    #endregion

    #region OP:GetSystemTypes
    public string GetSystemTypes(string SPUrl)
    {
        List<string> systemTypeList = new List<string>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESRSystems"];
                SPQuery camlQuery = new SPQuery();
                camlQuery.Query = @"<OrderBy>
                                      <FieldRef Name='SystemType' />
                                   </OrderBy>";
                camlQuery.ViewFields = @"<FieldRef Name='SystemType' />";
                SPListItemCollection listItems = mList.GetItems(camlQuery);
                string systemType = "";
                foreach (SPListItem item in listItems)
                {
                    if (systemType != item["SystemType"].ToString())
                    {
                        systemType = item["SystemType"].ToString();
                        systemTypeList.Add(systemType);
                    }
                }
            }
        }
        return CreateJsonResponse(systemTypeList.ToArray());
    }
    #endregion

    #region OP:GetCPLValues

    public string GetCPLValues(string SPUrl)
    {
        List<string> choiceList = new List<string>();
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                SPList mList = web.Lists["DESR"];
                SPFieldChoice mField = (SPFieldChoice)mList.Fields["ControlPanelLayout"];
                foreach (string mChoice in mField.Choices)
                {
                    choiceList.Add(mChoice);
                }                
            }
        }
        return CreateJsonResponse(choiceList.ToArray());
    }
    #endregion

    #region OP:LogOut

    public void LogOut(string SPUrl)
    {
        this.AddLog(SPUrl, "LOGOUT", null);
    }

    #endregion

    #region OP:AccessedHelp

    public void AccessedHelp(string SPUrl)
    {
        this.AddLog(SPUrl, "ACCESSED HELP", null);
    }

    #endregion

    #region OP:AddLog

    public void AddLog(string SPUrl, string action, string searchText)
    {
        string currentUser;
        using (SPSite site = new SPSite(SPUrl))
        {
            using (SPWeb web = site.OpenWeb())
            {
                currentUser = web.CurrentUser.LoginName.Substring(web.CurrentUser.LoginName.IndexOf('|') + 1);
            }
        }
        using (SqlConnection sqlConn = new SqlConnection(System.Configuration.ConfigurationManager.AppSettings["SQLConnection"]))
        {
            using (SqlCommand sqlComm = new SqlCommand())
            {
                sqlComm.Connection = sqlConn;
                sqlComm.CommandText = "dbo.sp_addDESRLog";
                sqlComm.CommandType = CommandType.StoredProcedure;

                SqlParameter username = sqlComm.CreateParameter();
                username.ParameterName = "@username";
                username.DbType = DbType.String;
                username.Value = currentUser;
                sqlComm.Parameters.Add(username);

                SqlParameter useraction = sqlComm.CreateParameter();
                useraction.ParameterName = "@action";
                useraction.DbType = DbType.String;
                useraction.Value = action;
                sqlComm.Parameters.Add(useraction);

                SqlParameter userSearchText = sqlComm.CreateParameter();
                userSearchText.ParameterName = "@searchText";
                userSearchText.DbType = DbType.String;
                userSearchText.Value = DBNull.Value;
                if (searchText != null)
                {
                    userSearchText.Value = searchText;
                }
                sqlComm.Parameters.Add(userSearchText);

                try
                {
                    sqlConn.Open();
                    sqlComm.ExecuteScalar();
                }
                catch (Exception ex)
                {
                    throw ex;
                    //throw new Exception(ex.Message);
                }
            }
        }
    }

    #endregion

}