## Some paths are hardoced in this script
# 1. $eclipsec:                 points to the eclipse executable inside the ccs install and is relative to the scripts folder containing this script. Note that the script should be run from this folder 
#JSON.pm needs to be added to image
# CCS does not have reference to rtsc, need to launch CCS and manually configure the references to the dappropriate dependent packages and versions

  use JSON;
  use File::Spec;

  local $/;

  my $active_config = "no";
  my $json_obj = new JSON;

  #my $eclipsec =  "~/ccs-cloud.local/ccs/ccsv6/eclipse/eclipse";
  my $eclipsec =  File::Spec->catfile( ("..", "..", "..", "eclipse"), "eclipse" );

  print "$eclipsec\n";
  my $windows=($^O=~/Win/)?1:0;# Are we running on windows?
  print "OS: $^O  $windows\n";
  my $SL;
  if($windows == 1){
	  $SL = "\\";
  }
  else{
	  $SL = "/";
  }

  my $content_file_name = "";
  # (1) quit unless we have the correct number of command-line args
  $num_args = $#ARGV + 1;
  if( ($num_args != 3) && ($num_args != 4)) {
    print "\n====================================================================\n";
    print "\n\nUsage:\nperl dependency-creator.pl <packages_base_dir> <package_meta_data_relative_path> <temp_workspace_path> [<content_db_file>]\n\n";
    print "E.g.\nperl  dependency-creator.pl  d:\\ti\\tirex-remoteserver\\content\\  C2000Ware_0_09_00_00\\.metadata\\.tirex\\  WS  c2000ware__1.00.00.00\n\n";
    print "or E.g.\nperl dependency-creator.pl /home/auser/ti-rex-content/  coresdk_msp432_3_01_00_08_eng/.metadata/.tirex/  Workspace\n";
    print "\n\n";
    print "The optional content db file as the 4th parameter to the script method is needed if any of the following are to be handled\n";
    print "\t1. The resources content json file is not the default name of content.tirex.json\n";
    print "\t2. There are more than 1 resource content json files (having convention *.content.tirex.json)\n";
    print "\t3. Macros are used for the resource entries having 'resourceType' value of 'project.ccs'\n";
    print "\n\n";
    print "Here are the steps to form the content db file\n";
    print "\n";
    print "From the  <CCS INSTALL>\\ccsv7\\tirex\\ti-rex-core\\  location, run the following\n";
    print "..\\node app.js dinfra-desktop\\dinfra.js x x --myHttpPort=  --contentPath=<content base path> --dbPath=<content db genration location> --contentPackagesConfig=<packages json file> --logsDir=<logs dir> --refreshDB=true\n";
    print "\n";
    print "E.g.\n";
    print "..\\node app.js dinfra-desktop\\dinfra.js x x --myHttpPort=  --contentPath=/ti/tirex-remoteserver/content --dbPath=D:\\REX\\db --contentPackagesConfig=config\\contentPackages\\test.json --logsDir=D:\\REX\\logs --refreshDB=true\n";
    print "\n";
    print "The packages json file needs to contain an entry for this package.\n\nE.g.\n";
    print "\n[\n";
    print "\t\"C2000Ware_0_09_00_00\"";
    print "\n]\n";
    print "\n";
    print "\n";
    print "Note: The --contentPath has to be Linux style forward slashes in the path (even on windows). The path is for the drive the script is run from\n";
    print "\n";
    print "\n";
    print "The content db file will be generated in the folder specified in 'dbPath'. Will be in a sub folder called 'resources.db'\n";
    print "Copy the content db file from here to your package's .metadata\\.tirex\\ folder.\n";
    print "\n";
    print "The dependency generator perl script can now make use of this content db file (by specifying it as the 4th parameter)\n";
    print "\n====================================================================\n";

    exit;
  }
  else{
    if($num_args == 4){
       $content_file_name = $ARGV[3];
    }
    else{
       $content_file_name = "content.tirex.json";
    }
  }
   
  

    #$package_base_dir = "/home/auser/ccs-cloud-storage/ti-rex/git/ti-rex-content/";
    $package_base_dir = $ARGV[0];
    if($package_base_dir =~ /[\/\\]$/) {
    }
    else{         
      $package_base_dir = "$package_base_dir$SL";
      print "package_base_dir = $package_base_dir\n";
    }
  
    $package = $ARGV[1];
    if($package =~ /[\/\\]$/) {
      print "package = $package\n";
    }
    else{         
      $package = "$package$SL";
      print "package = $package\n";
    }
  
  if( $package =~ /(.*)[\/\\](.+)/ ) {
    $package_name = $2; 
    $package_parent_dir = "$package_base_dir$1$SL";
    print "package_parent_dir = $package_parent_dir\n";
  }
  else{
     $package_name = $package;
     $package_parent_dir = $package_base_dir;
     print "package_parent_dir =  $package_parent_dir\n";
  }
  print "package_name = $package_name\n";


  $package_dir = "$package_parent_dir$package_name";
  #$workspace_base_dir = "$ARGV[2]/./DEBUG/temp";
  $workspace_base_dir =  File::Spec->catdir( $ARGV[2], "DEBUG", "temp" );
  print "workspace_base_dir = $workspace_base_dir\n";
  if (!(-e $workspace_base_dir)) {
     print "Creating $workspace_base_dir \n";
     if($windows == 1){
     	system( "mkdir $workspace_base_dir");
     }
     else{
     	system( "mkdir -p $workspace_base_dir");
     }
     if (!(-e $workspace_base_dir)) {
       print "Cannot create $workspace_base_dir \n";
       exit;
     }
  }

  if($windows == 1){
  	$dependency_dir = "$ARGV[2]\\.\\DEBUG\\Dependencies\\$package_name";
	$contentjson_path = "$package_dir\\$content_file_name";
	system( "rmdir /s /q $workspace_base_dir");
  }
  else{
	$dependency_dir = "$ARGV[2]/./DEBUG/Dependencies/$package_name";
	$contentjson_path = "$package_dir/$content_file_name";
	system( "rm -rf $workspace_base_dir");
  }

  if (!(-e $contentjson_path)) {
     print "Cannot find $contentjson_path \n";
     exit;
  }
   
  open( my $fh, '<', $contentjson_path );
  
  $json_text   = <$fh>;
  my $data = decode_json( $json_text );
  #print $data, length($data), "\n";


if($windows == 1){
  system( "mkdir $dependency_dir$SL1.dependencies");
}
else{
  system( "mkdir -p $dependency_dir/.dependencies");
}

my $map_empty = 1;
my %project_to_location_map;
my %dependency_map_keys = ();
open( MAPOUT, ">$dependency_dir/dependency-mapping.json");
print MAPOUT "{\n";
my $dependency_file_count = 0;
my $dependency_file_name = "";
my $visibility;


################################
# Parameters that distinguish between project/projectSpec
my $project_type;
################################



#exit;

##TODO write out the last json obj  ===============================================================================

$project_type = "project";
processResource();
$project_type = "projectspec";
processResource();
$project_type = "project";
processIARResource();

print MAPOUT "\n}";
close(MAPOUT);

if($windows == 1){
  system( "mkdir $package_dir\.dependencies");
  print "xcopy /s /q $dependency_dir\\.dependencies $package_dir\\.dependencies\n";
  system( "xcopy /s /q $dependency_dir\\.dependencies $package_dir\\.dependencies");
  print "copy $dependency_dir\\dependency-mapping.json $package_dir\\.dependencies\n";
  system( "copy $dependency_dir\\dependency-mapping.json $package_dir\\.dependencies");
}
else{
  print "cp -r $dependency_dir/.dependencies $package_dir\n";
  system( "cp -r $dependency_dir/.dependencies $package_dir");
  print "cp $dependency_dir/dependency-mapping.json $package_dir/.dependencies/\n";
  system( "cp $dependency_dir/dependency-mapping.json $package_dir/.dependencies/");
}

####----Subroutines---------------------######
#
sub processIARResource {

#print "\n=====IAR $project_type=====\n\n";
$count = 0;
$dependency_file_count = 0;
for my $element (@$data) {
  $resourceType = $element->{resourceType};
  $location = $element->{location};
  $link = $element->{link};
  if($link eq undef){
    $link = $element->{location};
  } 

  $ipcf = "";
  #remove the ipcf file name if it points to a file
  if($link =~ /([^\\\/]+\.ipcf)/){
    $ipcf = $1;
    $link = $link =~ s/[^\\\/]+\.ipcf//r;
  }

  $originalJsonFile = $element->{_originalJsonFile};
  if(!($originalJsonFile eq undef)){
    if($originalJsonFile =~ /(.+[\\\/])(.+)/){
      $originalJsonFile =  $1;
    }
    $link = formRelativePath( $originalJsonFile, $link );
    #print "RP $originalJsonFile\n$link\n$link\n"; 	    
  }

  if( $resourceType eq "project.iar"){
	  #print "IAR $element->{name} \n";


  #open( JSONOUT, ">$dependency_dir$SL"."$1$SL"."$name.dependency.tirex.json");
  $dependency_file_name = "iar_$dependency_file_count.dependency.tirex.json";
	    
  #$value = $project_to_location_map{ $newname }; 

  #$key = $project_to_location_map{$newname};
  #if(!( exists $dependency_map_keys{ $key  } )){
    if($map_empty == 0){
      print MAPOUT ",\n";
    }
    else{
      $map_empty = 0;
    }

    #print MAPOUT "  \"$project_to_location_map{$newname}\": \"$dependency_file_name\"";
    print MAPOUT "  \"../$link/$ipcf\": \"$dependency_file_name\"";
    #$dependency_map_keys{$key} = 1;
  #}
  #else{
    #print "key $key exists in dependency-mapping.json\n"; 
  #}
  #print "\n\n$newname MAPOUT  \"$value\": \"$dependency_file_name\"\n\n";

  $dependency_file_count++;

  open( JSONOUT_2, ">$dependency_dir$SL".".dependencies$SL"."$dependency_file_name");
  #print ">>>>$dependency_dir$SL".".dependencies$SL"."$dependency_file_name\n";

 
  #search for .c file in the folder
  #if( $resourceType eq "project.iar"){
	  #opendir my $dir, "$package_parent_dir"."$link" or die "Cannot open directory $!";
	  #my @files = readdir $dir;
	  #print "@files\n";
	  #closedir $dir;
	  
	opendir(DIR, "$package_parent_dir"."$link") or die $!;
        my @file_array = ();
        my $file_count = 0;
    	while (my $file = readdir(DIR)) {
        	# We only want files
		#next unless (-f "$dir/$file");


	        # Use a regular expression to find files ending in .c
		# We need to add them to the dependency files
		if( $file =~ m/\.[ch]$/){
                  $file_array[$file_count++] = "+$file -> $file";
		  #print "$file\n";
		}

		#find ipcf files, and get the dependencies
		if( $file =~ m/\.ipcf$/){
			#print "$package_parent_dir"."$link"."$file\n";
		   
		  $iarmacros = {
                     PROJ_DIR => '',
		     SIMPLELINK_MSP432_SDK_INSTALL_DIR => ''
		  };


	          open(IPCF, "$package_parent_dir"."$link\\"."$file") or die $!;
                  my $files_section = 0;
		  
		  local $/ = "\n";
		  while(<IPCF>){
                     if($files_section == 1){
		       if( /< ?path +copyTo ?= ?"(.+?)" ?> ?(.+) ?<\/path>/){ 	     
			 $copy_to = $1;
			 $copy_from = $2;

			 # note this is only handling one macro
			 while($copy_to =~ /\$(.+?)\$/){  
                            $copy_to = $copy_to =~ s/\$(.+?)\$/$iarmacros->{$1}/r;  
			    #print "$copy_to\n";
			 }
			 $copy_to = $copy_to =~ s/^[\/\\]//r;

			 # note this is only handling one macro
			 while($copy_from =~ /\$(.+?)\$/){  
                            $copy_from = $copy_from =~ s/\$(.+?)\$/$iarmacros->{$1}/r;  
			    #print "$copy_from\n";
			 }
			 $copy_from = $copy_from =~ s/^[\/\\]//r;

                         $file_array[$file_count++] = "+$copy_from -> $copy_to";
			 #print "$copy_to <-- $copy_from\n";
		       }
	             }
                     if( /<files>/ ){
                       $files_section = 1;
		     }
                     elsif( /<\/files>/ ){
                       $files_section = 0;
		     }
		  }
		  close(IPCF);
		}
 	 }
	 closedir(DIR);

 #}
 #
 $compiler = {
                specified => 'na',
                effective => 'na',
                location => 'na'
            };
 my @dependencyobj = ();
 $dependencyobj[0] = {
                              name => 'na',
                              default => 'na',
                              compiler => $compiler,
                              packages => \@product_array,
                              files => \@file_array
  };
 print JSONOUT_2 $json_obj->pretty->encode(\@dependencyobj);
 close( JSONOUT_2 );

  


  
  } 

} #end resource for

}

sub processResource {
print "\n=====$project_type=====\n\n";
$workspace = "$workspace_base_dir$SL"."CCSworkspace_$project_type$SL";
$info_file = "$workspace_base_dir$SL"."$project_type"."ExternalResources.txt";
$args_file = "$workspace_base_dir$SL"."import$project_type"."LocationArgs.txt";


# clean the workspace
#system( "rm -rf $workspace");
if($windows == 1){
    system( "mkdir $workspace");
}
else{
    system( "mkdir -p $workspace");
}

#system( "rm $info_file");
open( OUT, ">$args_file");

#we no longer set the product path to CCS, the onus is on the CCS installed to have the right set of packages
#system( "$eclipsec -noSplash -data $workspace -application com.ti.common.core.initialize -rtsc.productDiscoveryPath $package_base_dir");

$count = 10000;
for my $element (@$data) {
    $resourceType = $element->{resourceType};
    $location = $element->{location};
    $link = $element->{link};
    if($link eq undef){
      $link = $element->{location};
    }

    $originalJsonFile = $element->{_originalJsonFile};
    if(!($originalJsonFile eq undef)){
      
      if($originalJsonFile =~ /(.+[\/\\])(.+)/){
	$originalJsonFile =  $1;
      }
      
      $link = formRelativePath( $originalJsonFile, $link );
      #print "RP $originalJsonFile\n$link\n$link\n"; 	    
    }


#NOTE for sproject specs we still have a reference to resourceType: "projectSpec" 
if( ( ( $project_type eq "project") && ( $resourceType eq "project.ccs") && (!($link =~ /project[sS]pec/)) ) ||
    ( ( $project_type eq "projectspec") && (($resourceType eq "project.ccs")||($resourceType eq "projectSpec")) && ($link =~ /project[sS]pec/) ) ){
      $project = $element->{name};
      $location = "$package_dir$link";
      my $projectspec_filename;
      if($project_type eq "projectspec"){
      if ($location =~ /^(.*\/)(([^\/]+)\.projectspec)/){
          $location = $1;
	  $projectspec_filename = $2;
      }
      else{
        print "should have been a .projectspec file\n";
        exit;
      }
                   
      $advanced = $element->{advanced};
      $value = "false";
      if(!($advanced eq undef)){
         $value = $advanced->{overrideProjectSpecDeviceId};
         if($value eq "true"){
            $coretype = $element->{coreTypes}->[0];
            #print "coreType $coretype\n";
         }
      }
      }
      $newname = "project_$count";
      $count++;

      if($project_type eq "projectspec"){
        if($value eq "true"){
          print OUT "-ccs.location \"$location$projectspec_filename\" -ccs.captureCopiedFileOrigins -ccs.captureProjectspecApplicability -ccs.renameTo $newname\n"; 
        }
        else{
          print OUT "-ccs.location \"$location$projectspec_filename\" -ccs.captureCopiedFileOrigins -ccs.renameTo $newname\n";
        }
      }
      else{
        print OUT "-ccs.location \"$location\" -ccs.captureCopiedFileOrigins -ccs.copyIntoWorkspace -ccs.renameTo $newname\n";
      }

      #print " newname = $newname\n project = $project_to_location_map{ $newname }\n link  ===  $link\n";
      $project_to_location_map{ $newname } = "../$link";
    }
}

close OUT;

$dependency_file_count=0;


if($count != 10000){   
   system( "$eclipsec -noSplash -data $workspace -application com.ti.ccstudio.apps.projectImport -ccs.args $args_file");
   #print "$eclipsec -noSplash -data $workspace -application com.ti.ccstudio.apps.projectImport -ccs.args $args_file\n";
   print "---imported\n";
   if($project_type eq "projectspec"){
     system( "$eclipsec -noSplash -data $workspace -application com.ti.ccstudio.apps.inspect -ccs.captureProjectspecApplicability -ccs.projects:projectSpecApplicability -ccs.projects:externalResources -ccs.projects:externalResources:noDirs > $info_file 2> $workspace_base_dir/projectspecStdErrors.txt");              
   }
   else{
     system( "$eclipsec -noSplash -data $workspace -application com.ti.ccstudio.apps.inspect -ccs.projects:externalResources -ccs.projects:externalResources:noDirs > $info_file 2> $workspace_base_dir/projectStdErrors.txt");
   }
   print "---inspected\n";
   system( "$eclipsec -noSplash -data $workspace -application com.ti.ccstudio.apps.inspect -ccs.captureProjectspecApplicability -ccs.projects:projectSpecApplicability -ccs.projects:externalResources -ccs.projects:externalResources:noDirs > $info_file 2> $workspace_base_dir/projectspecStdErrors.txt");              
}

$/ = "\n";

$location = "$info_file";
#print "\n--$location\n";


if (-e $location) { 
      #if (-e $location) {  
         #  system( "rmdir /s /q $dependency_dir");
      #}

      if($windows == 1){
	 system( "mkdir \"$dependency_dir$SL.dependencies\""); 
      }
      else{
      	 system( "mkdir -p \"$dependency_dir$SL.dependencies\""); 
      }
      my $first_file = "true";
      my $info_type = ""; 
      my $origin = "";
      my $valid_processing = 0;
      open(IN, $location) or die("Could not open file.");
      while(<IN>){

         #print "active config = $active_config   info_type = $info_type   $_";
         if(/^Project: project_1/){
           $valid_processing = 1;
         }
         elsif(/~~~~~/){
           $valid_processing = 0;
         }

         if( $valid_processing == 0){
           next;
         }

         if(/^Project: ([^ ]+) .*origin:\"(.*)\"/){
            $newname = $1;
            $origin = $2;
            $origin =~ s/[\\\/]$//;
            #print "\norigin = $origin\n";
            $_ = $origin;
            ##print "\ndependency_dir = $dependency_dir\n";
            #print "\npackage_dir = $package_dir\n";
	    
            #linux style slashes put out by project server no matter which OS
            #if($windows==0){
            #   /$package_dir(.*)\/(.*)/;
            #}
            #else{
            #   /$package_dir(.*)\\(.*)/;
            #}

            $temp = $package_dir;
	    #$temp =~ s/\\/\//g;
	    #if(/$temp(.*)\/(.*)\.projectspec/){
               #print "1-2 $1 $2\n";
	       #}
	    #else{
              #print "\norigin = $origin\n";
              #print "\npackage_dir = $package_dir\n";
              #below is no longer an issue
              #print "packagedir not matched in origin\n";
              #exit;
	    #}
            $name = $2;
	    #print "DEPENDENCY DIR $dependency_dir/$1\n";
	    if($windows == 1){
            	system( "mkdir \"$dependency_dir/$1\"");
    	    }
	    else{
            	system( "mkdir -p \"$dependency_dir/$1\"");
	    }
            $info_type = "project";
            if($first_file eq "true"){
               #close(OUT);
               close(JSONOUT);
               close(JSONOUT_2);
               $first_file = "false";
            }

	    #print "DEBUG JSONOUT_2 json_obj->pretty->encode(dependencyobj)\n";
            #print "DEBUG close(JSONOUT)\n";
            print JSONOUT $json_obj->pretty->encode(\@dependencyobj);
            print JSONOUT_2 $json_obj->pretty->encode(\@dependencyobj);
            close(JSONOUT);
            close(JSONOUT_2);


            $compiler = {
                specified => 'na',
                effective => 'na',
                location => 'na'
            };
            @product_array = ();
            $product_count = 0;

            @file_array = ();
            $file_count = 0;

            @dependencyobj = ();
            $config_index = 0;

            $dependencyobj[$config_index] = {
                              name => 'na',
                              default => 'na',
                              compiler => $compiler,
                              packages => \@product_array,
                              files => \@file_array
                            };
            if($product_count > 0){
                $dependencyobj[$config_index]->{productdependencies} = \@product_array;
            }
            $config_index++;

	    #print "DEPENDENCY FILE $dependency_dir/$1/$name.dependency\n";
            #open(OUT, ">$dependency_dir/$1/$name.dependency");
	    #print "DEBUG open JSONOUT $dependency_dir/$1/$name.dependency.tirex.json\n";
	    open( JSONOUT, ">$dependency_dir$SL"."$1$SL"."$name.dependency.tirex.json");
	    if($project_type eq "project"){
               $dependency_file_name = "folder_$dependency_file_count.dependency.tirex.json";
    	    }
	    else{
	       $dependency_file_name = "spec_$dependency_file_count.dependency.tirex.json";
            }
	    

            $value = $project_to_location_map{ $newname }; 

	    $key = $project_to_location_map{$newname};
            if(!( exists $dependency_map_keys{ $key  } )){
              if($map_empty == 0){
                print MAPOUT ",\n";
              }
              else{
                $map_empty = 0;
              }

	      #print MAPOUT "  \"$project_to_location_map{$newname}\": \"$dependency_file_name\"";
	      print MAPOUT "  \"$key\": \"$dependency_file_name\"";
	      $dependency_map_keys{$key} = 1;
            }
            else{
		#print "key $key exists in dependency-mapping.json\n"; 
	    }
            #print "\n\n$newname MAPOUT  \"$value\": \"$dependency_file_name\"\n\n";

	    open( JSONOUT_2, ">$dependency_dir$SL".".dependencies$SL"."$dependency_file_name");
            $dependency_file_count++;
            #print "DEPENDENCY FILE > $dependency_dir/$1/$name.dependency.tirex.json\n";
	    #print "DEPENDENCY FILE > $dependency_dir$SL".".dependencies$SL"."$dependency_file_name\n";
            #print "\nNEW => $&\n\n";
            $active_config = "no";
            $relative_todir = "$2";
	    #print "relative_todir $relative_todir\n";
	    if($relative_todir =~ /(.+)([\\\/].+.projectspec)/){
               $relative_todir = $1;
	    }
            $relative_todir =~ s/\\/\//g;
	    #print "relative_todir $relative_todir\n";
         }
         elsif(/Linked resources:/){
            $info_type = "linkedresources";
         }
         elsif(/Build flags:/){
            #print "\ninfo_type = buildflags\n";
            $info_type = "buildflags";
	    $visibility = "-";
         }
         elsif(/Source dependencies:/){
            #print "\ninfo_type = sourcedependencies\n";
            $info_type = "sourcedependencies";
	    $visibility = "+";
         }
         elsif(  (($info_type eq "buildflags") || ($info_type eq "sourcedependencies")) &&
		 ($active_config eq "yes")&&(/(\w:)?\/.+/)
	      ){

             $build_flag = $&;

	     #print "project dir $relative_todir\n";
	     #print "build flags $build_flag\n";
             #print "base dir    $package_base_dir\n";
	     #print "package dir $package_dir\n";

             my $path = "";
             $temp = $package_dir;
             $temp =~ s/\\/\//g;
	     #assuming 3.0 spec 
	     $temp =~ s/\.metadata\/\.tirex\///g;  
	     #print "package dir $temp\n";
             if($build_flag =~ /$temp/){
		 #print "REGEX result: \n==$`\n==$&\n==$'\n";
		 $path = File::Spec->abs2rel(  $build_flag, $relative_todir );
                 $file_array[$file_count++] = "$visibility$path";
             }
             else{
		 #print "CROSS PACKAGE\n";

                 $arg1="$package_dir$relative_todir";
		 #print "arg1        $arg1\n";
		 #print "build flags $build_flag\n";
                 $path = File::Spec->abs2rel(  $build_flag, $arg1 );
		 ### we are not adding Cross Package dependencies
		 #$file_array[$file_count++] = "$visibility$path";
             }
	     #print "$visibility$path\n";
         }
         elsif(/Copied resources:/){
            $info_type = "copiedresources";
         }
         elsif(/Configuration: (.+) \[(.+)\]/){
             #print "Configuration RegEx Match=> $===$&===$'===$1===$2\n";
             $active_config = "yes";
          }
          elsif(/Configuration: (.+)/){
             #print "Configuration RegEx Match=> $===$&===$'===$1\n";
             $active_config = "no";
          }
          elsif(/Compiler:/){
             $info_type = "compiler";
             #print "Compiler RegEx Match=> $&\n";
          }
          elsif(/Products:/){
             $info_type = "products";
             #if($active_config eq "yes"){
                 $product_array = ();
                 $product_count = 0;
             #}
             #print "Products: RegEx Match=> $&\n";
          }
          elsif(($info_type eq "products")&&(/product: (.+) \[(.+)\]/)){
             $product = {};
             if($active_config eq "yes"){
                 $product->{id} = "$1";
                 $product->{name} = "$2";
             }
             #print "RegEx Match=> $&\n";
          }
          elsif(($info_type eq "products")&&(/specified version: (.+)/)){
              if($active_config eq "yes"){
                 $product->{specified} = "$1";
              }
              #print "RegEx Match=> $&\n";
          }
          elsif(($info_type eq "products")&&(/effective version: (.+) \[(.+)\]/)){
               if($active_config eq "yes"){
                 $product->{effective} = "$1";
                 #$product->{location} = "$2";
		 ##TODO remove this workaround. Should just remove the packages =>  instead of not assigning here. Currently there is a bug in the refresher
                 #$product_array[$product_count++] = $product;
               }

               #print "RegEx Match=> $&\n";
          }
         elsif(/[\/\\]/){
	      
            if($project_type eq "projectspec"){
            if($origin =~ /(.*)[\\\/].*\.project[sS]pec$/){
               $temp_origin = $1;
            }      
            else{
               print "NO MATCH origin $origin\n";
               $temp_origin = $origin;
               exit;
            }    
    	    }
	    else{
               $temp_origin = $origin;
	    }


	    if($info_type eq "products"){
            }
	    elsif($info_type eq "linkedresources"){
               /\s*(.*) \[(.*)\]/;
               #print "LR: $1 $2\n";
               
	       $target = $1;
               $string1 = $temp_origin;
               $string2 = $2;
               
	       #print "linked resources = $string1, $string2\n";
               my $path = formRelativePath( $string1, $string2 );

               if($project_type eq "project"){
               #this only for projects since the paths in the file are relative to the ccs.dependency file which is not inside the project folder
		       
	       #linux style slashes put out by project server no matter which OS
	       if($path =~ /^(..\/)?(.*)/ ) 
	       {
                  $path = $2;
               }
	       if( $target =~ /^(..\/)?(.*)/ )
	       {
                  $target = $2;
               }
               }


               #print "+$path ->$target\n";
               #print OUT "+$path -> $target\n";
               $file_array[$file_count++] = "+$path -> $target";
               #exit;
            }
            elsif($info_type eq "copiedresources"){
               /\s*(.*) \[(.*)\]/;
               
	       $target = $1;
               
               $string1 = $temp_origin;
               $string2 = $2;
               my $path = formRelativePath( $string1, $string2 ); 

               if($project_type eq "project"){
               #this only for projects since the paths in the file are relative to the ccs.dependency file which is not inside the project folder
	       
	       #linux style slashes put out by project server no matter which OS
               if($path =~ /^(..\/)?(.*)/ )
	       {
                  $path = $2;
               }
       		}
	       
               #print "copiedresources: +$path -> $target\n\n";
               #print OUT "+$path -> $target\n"; 
               $file_array[$file_count++] = "+$path -> $target";
               #exit;
            }
            
         }
	 else{
	   #print "UNPROCESSED $_";
	 }
      }
      close IN;
      #close OUT;

     if($product_count > 0){
        $dependencyobj[$config_index]->{productdependencies} = \@product_array;
      }
      $config_index++;
      #print "DEBUG JSONOUT json_obj->pretty->encode(dependencyobj)\n";
      #print "DEBUG close(JSONOUT)\n";
      print JSONOUT $json_obj->pretty->encode(\@dependencyobj);
      print JSONOUT_2 $json_obj->pretty->encode(\@dependencyobj);
      close(JSONOUT);
      close(JSONOUT_2);
}

} #sub processResource

sub formRelativePath {
               my $n; 
               my @params = @_;
               my @array1 = split(/\\|\//, $params[0]);
               my @array2 = split(/\\|\//, $params[1]);
               if( @array1 < @array2 ){
                  $n = @array1;
               }
               else{
                  $n = @array2;
               }
               
               my $i;
               for($i=0;$i<$n;$i++){
                  if($array1[$i] eq $array2[$i]){ 
                  }
                  else{
                    last;
                  }
               }
               
               #print "Common $i\n";
               
               $len1 = scalar @array1 - $i;
               #print "Remainder of origin $len1\n";
               $len2 = scalar @array2 - $i;
               #print "Remainder of dependency $len2\n";
               my $path = "";
               for(my $j=0;$j<$len1;$j++){
                  $path = "$path../";
               }
               for(my $j=$len2-1;$j>=0;$j--){
                  $index = scalar @array2 - 1 - $j;
                  #print "$index ";               
                  $path = "$path/$array2[$index]";
               }
               
               $path =~ s/\\\\/\\/g;
               $path =~ s/\/\//\//g;
               if($path =~ /^[\\\/](.*)/){
                  return $1;
               }
               else{
                  return $path;
               }
     }
