package action.ajax;

import com.opensymphony.xwork2.Action;
import com.opensymphony.xwork2.ActionSupport;
import org.apache.struts2.components.File;

public class FilesProcessing extends ActionSupport {

    private String uploadFiles;

    private File[] fileUpload;
    private String fileUploadContentType;
    private String fileUploadFileName;

    public String execute(){
        return Action.SUCCESS;
    }

    public String getUploadFiles() {
        return uploadFiles;
    }

    public void setUploadFiles(String uploadFiles) {
        this.uploadFiles = uploadFiles;
    }
}
