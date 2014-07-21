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
using Microsoft.SharePoint.Administration.Claims;
using Microsoft.SharePoint.WebControls;
using Microsoft.SharePoint.Administration;

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
            WriteResponse(200, opResult);
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
                SPList mList = web.Lists.TryGetList("Sales Material");
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

    public void SetBasicAuthHeader(WebRequest request, String userName, String userPassword)
    {
        string authInfo = userName + ":" + userPassword;
        authInfo = Convert.ToBase64String(System.Text.ASCIIEncoding.ASCII.GetBytes(authInfo));
        request.Headers["Authorization"] = "Basic " + authInfo;
    }
    
    public string Authenticate(string username, string password)
    {
        try
        {
            var request = WebRequest.Create("http://tusspdev1/VirtualApps/MKTWebs/TAMS.MKT.MarketingMaterialCatalog.Mobile/login/AuthorizationCheck/test.html");
            SetBasicAuthHeader(request, username, password);
            var response = request.GetResponse();
            return CreateJsonResponse(true);
        }
        catch (Exception ex)
        {
            return CreateJsonResponse(false);
        }

    }

    #endregion
}